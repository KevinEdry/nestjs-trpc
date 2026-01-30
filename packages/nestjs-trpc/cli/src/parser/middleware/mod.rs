mod extraction;

use crate::parser::ParsedFile;
use std::path::PathBuf;
use swc_ecma_ast::{Class, ClassMember, ClassMethod, Decl, ModuleDecl, ModuleItem, PropName, Stmt};
use tracing::{debug, trace};

pub use extraction::extract_use_middlewares_names;

fn filter_use_method(member: &ClassMember) -> Option<&ClassMethod> {
    let ClassMember::Method(method) = member else {
        return None;
    };
    let method_name = get_method_name(method);
    (method_name.as_deref() == Some("use")).then_some(method)
}

fn get_method_name(method: &ClassMethod) -> Option<String> {
    match &method.key {
        PropName::Ident(identifier) => Some(identifier.sym.to_string()),
        PropName::Str(string) => Some(string.value.to_string_lossy().into_owned()),
        _ => None,
    }
}

#[derive(Debug, Clone)]
pub struct MiddlewareInfo {
    pub class_name: String,
    pub file_path: PathBuf,
    pub context_properties: Vec<ContextProperty>,
}

#[derive(Debug, Clone)]
pub struct ContextProperty {
    pub name: String,
    pub type_string: String,
}

#[derive(Debug, Clone, Default)]
pub struct MiddlewareParser;

impl MiddlewareParser {
    #[must_use]
    pub const fn new() -> Self {
        Self
    }

    pub fn extract_middleware(
        &self,
        parsed_file: &ParsedFile,
        middleware_class_name: &str,
    ) -> Option<MiddlewareInfo> {
        debug!(
            path = ?parsed_file.file_path,
            class = %middleware_class_name,
            "Extracting middleware class info"
        );

        let info = parsed_file.module.body.iter().find_map(|item| {
            self.extract_from_module_item(item, middleware_class_name, parsed_file)
        });

        if let Some(ref info) = info {
            debug!(
                class = %info.class_name,
                properties = info.context_properties.len(),
                "Extracted middleware info"
            );
        } else {
            debug!(
                class = %middleware_class_name,
                "Middleware class not found"
            );
        }

        info
    }

    fn extract_from_module_item(
        &self,
        item: &ModuleItem,
        middleware_class_name: &str,
        parsed_file: &ParsedFile,
    ) -> Option<MiddlewareInfo> {
        match item {
            ModuleItem::ModuleDecl(ModuleDecl::ExportDecl(export_declaration)) => self
                .extract_from_export_declaration(
                    &export_declaration.decl,
                    middleware_class_name,
                    parsed_file,
                ),
            ModuleItem::Stmt(Stmt::Decl(Decl::Class(class_declaration))) => self
                .extract_from_class_if_matches(
                    class_declaration,
                    middleware_class_name,
                    parsed_file,
                ),
            _ => None,
        }
    }

    fn extract_from_export_declaration(
        &self,
        declaration: &Decl,
        middleware_class_name: &str,
        parsed_file: &ParsedFile,
    ) -> Option<MiddlewareInfo> {
        let Decl::Class(class_declaration) = declaration else {
            return None;
        };

        self.extract_from_class_if_matches(class_declaration, middleware_class_name, parsed_file)
    }

    fn extract_from_class_if_matches(
        &self,
        class_declaration: &swc_ecma_ast::ClassDecl,
        middleware_class_name: &str,
        parsed_file: &ParsedFile,
    ) -> Option<MiddlewareInfo> {
        let class_name = class_declaration.ident.sym.as_ref();
        let is_target_class = class_name == middleware_class_name;

        if !is_target_class {
            return None;
        }

        self.extract_from_class(class_name, &class_declaration.class, parsed_file)
    }

    fn extract_from_class(
        &self,
        class_name: &str,
        class: &Class,
        parsed_file: &ParsedFile,
    ) -> Option<MiddlewareInfo> {
        trace!(class = %class_name, "Searching for use method");

        let use_method = self.find_use_method(class)?;
        let body = use_method.function.body.as_ref()?;

        let context_properties = self
            .find_next_call(body)
            .map(|next_call| self.extract_context_properties(next_call, parsed_file))
            .unwrap_or_default();

        Some(MiddlewareInfo {
            class_name: class_name.to_string(),
            file_path: parsed_file.file_path.clone(),
            context_properties,
        })
    }

    #[allow(clippy::unused_self)]
    fn find_use_method<'a>(&self, class: &'a Class) -> Option<&'a ClassMethod> {
        let method = class
            .body
            .iter()
            .find_map(|member| filter_use_method(member));

        if method.is_some() {
            trace!("Found use method");
        }

        method
    }
}

#[must_use]
pub fn extract_middleware(
    parsed_file: &ParsedFile,
    middleware_class_name: &str,
) -> Option<MiddlewareInfo> {
    MiddlewareParser::new().extract_middleware(parsed_file, middleware_class_name)
}

#[must_use]
pub fn extract_middleware_names_from_class(class: &Class) -> Vec<String> {
    let class_middlewares = extract_class_level_middlewares(class);
    let method_middlewares = extract_method_level_middlewares(class);
    class_middlewares.chain(method_middlewares).collect()
}

fn extract_class_level_middlewares(class: &Class) -> impl Iterator<Item = String> + '_ {
    class
        .decorators
        .iter()
        .filter_map(extract_use_middlewares_names)
        .flatten()
}

fn extract_method_level_middlewares(class: &Class) -> impl Iterator<Item = String> + '_ {
    class
        .body
        .iter()
        .filter_map(extract_method_decorator_names)
        .flatten()
}

fn extract_method_decorator_names(member: &ClassMember) -> Option<Vec<String>> {
    let ClassMember::Method(method) = member else {
        return None;
    };

    let names: Vec<String> = method
        .function
        .decorators
        .iter()
        .filter_map(extract_use_middlewares_names)
        .flatten()
        .collect();

    (!names.is_empty()).then_some(names)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::parser::TsParser;
    use std::fs;
    use tempfile::TempDir;

    fn create_temp_file(content: &str) -> (TempDir, PathBuf) {
        let temp_directory = TempDir::new().expect("Failed to create temp dir");
        let file_path = temp_directory.path().join("protected.middleware.ts");
        fs::write(&file_path, content).expect("Failed to write test file");
        (temp_directory, file_path)
    }

    fn parse_and_extract(source: &str, class_name: &str) -> Option<MiddlewareInfo> {
        let (_temp, path) = create_temp_file(source);
        let parser = TsParser::new();
        let parsed = parser.parse_file(&path).expect("Failed to parse");
        MiddlewareParser::new().extract_middleware(&parsed, class_name)
    }

    #[test]
    fn test_extract_middleware_with_context() {
        let source = r"
            import { MiddlewareOptions, MiddlewareResponse, TRPCMiddleware } from 'nestjs-trpc';
            import { Injectable } from '@nestjs/common';

            @Injectable()
            export class ProtectedMiddleware implements TRPCMiddleware {
                async use(opts: MiddlewareOptions<object>): Promise<MiddlewareResponse> {
                    return opts.next({
                        ctx: {
                            ben: 1,
                        },
                    });
                }
            }
        ";

        let info = parse_and_extract(source, "ProtectedMiddleware");
        assert!(info.is_some());

        let info = info.unwrap();
        assert_eq!(info.class_name, "ProtectedMiddleware");
        assert_eq!(info.context_properties.len(), 1);
        assert_eq!(info.context_properties[0].name, "ben");
        assert_eq!(info.context_properties[0].type_string, "number");
    }

    #[test]
    fn test_extract_middleware_multiple_properties() {
        let source = r"
            export class AuthMiddleware {
                async use(opts) {
                    return opts.next({
                        ctx: {
                            userId: '123',
                            isAdmin: true,
                            permissions: ['read', 'write'],
                        },
                    });
                }
            }
        ";

        let info = parse_and_extract(source, "AuthMiddleware");
        assert!(info.is_some());

        let info = info.unwrap();
        assert_eq!(info.context_properties.len(), 3);

        let names: Vec<&str> = info
            .context_properties
            .iter()
            .map(|p| p.name.as_str())
            .collect();
        assert!(names.contains(&"userId"));
        assert!(names.contains(&"isAdmin"));
        assert!(names.contains(&"permissions"));
    }

    #[test]
    fn test_extract_middleware_no_context() {
        let source = r"
            export class LoggingMiddleware {
                async use(opts) {
                    let start = Date.now();
                    let result = await opts.next();
                    return result;
                }
            }
        ";

        let info = parse_and_extract(source, "LoggingMiddleware");
        assert!(info.is_some());

        let info = info.unwrap();
        assert!(info.context_properties.is_empty());
    }

    #[test]
    fn test_extract_middleware_class_not_found() {
        let source = r"
            export class SomeOtherClass {
                async use(opts) {
                    return opts.next({ ctx: { test: true } });
                }
            }
        ";

        let info = parse_and_extract(source, "ProtectedMiddleware");
        assert!(info.is_none());
    }

    #[test]
    fn test_extract_middleware_no_use_method() {
        let source = r"
            export class ProtectedMiddleware {
                async handle(opts) {
                    return opts.next({ ctx: {} });
                }
            }
        ";

        let info = parse_and_extract(source, "ProtectedMiddleware");
        assert!(info.is_none());
    }

    #[test]
    fn test_extract_middleware_nested_object() {
        let source = r"
            export class AuthMiddleware {
                async use(opts) {
                    return opts.next({
                        ctx: {
                            user: { id: '1', name: 'Test' },
                        },
                    });
                }
            }
        ";

        let info = parse_and_extract(source, "AuthMiddleware");
        assert!(info.is_some());

        let info = info.unwrap();
        assert_eq!(info.context_properties.len(), 1);
        assert_eq!(info.context_properties[0].name, "user");
        assert!(info.context_properties[0].type_string.contains("id:"));
    }

    #[test]
    fn test_convenience_function() {
        let source = r"
            export class TestMiddleware {
                async use(opts) {
                    return opts.next({ ctx: { test: 'value' } });
                }
            }
        ";

        let (_temp, path) = create_temp_file(source);
        let parser = TsParser::new();
        let parsed = parser.parse_file(&path).expect("Failed to parse");

        let info = extract_middleware(&parsed, "TestMiddleware");
        assert!(info.is_some());
    }
}
