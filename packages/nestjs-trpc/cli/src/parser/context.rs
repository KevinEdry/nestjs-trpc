use crate::parser::ParsedFile;
use std::path::PathBuf;
use swc_ecma_ast::{
    BlockStmt, Class, ClassMember, ClassMethod, Decl, Expr, Lit, ModuleDecl, ModuleItem, ObjectLit,
    Prop, PropName, PropOrSpread, ReturnStmt, Stmt,
};
use tracing::{debug, trace};

#[derive(Debug, Clone)]
pub struct ContextInfo {
    pub class_name: String,
    pub file_path: PathBuf,
    pub return_type: String,
}

fn filter_create_method(member: &ClassMember) -> Option<&ClassMethod> {
    let ClassMember::Method(method) = member else {
        return None;
    };
    let method_name = get_method_name(method);
    (method_name.as_deref() == Some("create")).then_some(method)
}

fn get_method_name(method: &ClassMethod) -> Option<String> {
    match &method.key {
        PropName::Ident(identifier) => Some(identifier.sym.to_string()),
        PropName::Str(string) => Some(string.value.to_string_lossy().into_owned()),
        _ => None,
    }
}

#[derive(Debug, Clone, Default)]
pub struct ContextParser;

impl ContextParser {
    #[must_use]
    pub const fn new() -> Self {
        Self
    }

    pub fn extract_context(
        &self,
        parsed_file: &ParsedFile,
        context_class_name: &str,
    ) -> Option<ContextInfo> {
        debug!(
            path = ?parsed_file.file_path,
            class = %context_class_name,
            "Extracting context class info"
        );

        let info =
            parsed_file.module.body.iter().find_map(|item| {
                self.extract_from_module_item(item, context_class_name, parsed_file)
            });

        if let Some(ref info) = info {
            debug!(
                class = %info.class_name,
                return_type = %info.return_type,
                "Extracted context info"
            );
        } else {
            debug!(
                class = %context_class_name,
                "Context class not found"
            );
        }

        info
    }

    fn extract_from_module_item(
        &self,
        item: &ModuleItem,
        context_class_name: &str,
        parsed_file: &ParsedFile,
    ) -> Option<ContextInfo> {
        match item {
            ModuleItem::ModuleDecl(ModuleDecl::ExportDecl(export_declaration)) => self
                .extract_from_export_declaration(
                    &export_declaration.decl,
                    context_class_name,
                    parsed_file,
                ),
            ModuleItem::Stmt(Stmt::Decl(Decl::Class(class_declaration))) => self
                .extract_from_class_if_matches(class_declaration, context_class_name, parsed_file),
            _ => None,
        }
    }

    fn extract_from_export_declaration(
        &self,
        declaration: &Decl,
        context_class_name: &str,
        parsed_file: &ParsedFile,
    ) -> Option<ContextInfo> {
        let Decl::Class(class_declaration) = declaration else {
            return None;
        };

        self.extract_from_class_if_matches(class_declaration, context_class_name, parsed_file)
    }

    fn extract_from_class_if_matches(
        &self,
        class_declaration: &swc_ecma_ast::ClassDecl,
        context_class_name: &str,
        parsed_file: &ParsedFile,
    ) -> Option<ContextInfo> {
        let class_name = class_declaration.ident.sym.as_ref();
        let is_target_class = class_name == context_class_name;

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
    ) -> Option<ContextInfo> {
        trace!(class = %class_name, "Searching for create method");

        let create_method = self.find_create_method(class)?;
        let return_type = self.extract_return_type(create_method, parsed_file)?;

        Some(ContextInfo {
            class_name: class_name.to_string(),
            file_path: parsed_file.file_path.clone(),
            return_type,
        })
    }

    #[allow(clippy::unused_self)]
    fn find_create_method<'a>(&self, class: &'a Class) -> Option<&'a ClassMethod> {
        let method = class
            .body
            .iter()
            .find_map(|member| filter_create_method(member));

        if method.is_some() {
            trace!("Found create method");
        }

        method
    }

    fn extract_return_type(
        &self,
        method: &ClassMethod,
        _parsed_file: &ParsedFile,
    ) -> Option<String> {
        let body = method.function.body.as_ref()?;
        let return_expression = self.find_return_expression(body)?;

        let return_type = self.expression_to_type_string(return_expression);
        trace!(return_type = %return_type, "Extracted return type");

        Some(return_type)
    }

    fn expression_to_type_string(&self, expression: &Expr) -> String {
        match expression {
            Expr::Object(object) => self.object_to_type_string(object),
            Expr::Array(_) => "unknown[]".to_string(),
            Expr::Lit(literal) => self.literal_to_type_string(literal),
            Expr::Ident(_) | Expr::Member(_) | Expr::Call(_) | Expr::Await(_) => {
                "unknown".to_string()
            }
            _ => "unknown".to_string(),
        }
    }

    fn object_to_type_string(&self, object: &ObjectLit) -> String {
        let properties: Vec<String> = object
            .props
            .iter()
            .filter_map(|prop| self.property_to_type_string(prop))
            .collect();

        format!("{{ {} }}", properties.join("; "))
    }

    fn property_to_type_string(&self, property: &PropOrSpread) -> Option<String> {
        let PropOrSpread::Prop(property_box) = property else {
            return None;
        };

        match &**property_box {
            Prop::KeyValue(key_value) => {
                let name = self.get_property_key_name(&key_value.key)?;
                let value_type = self.expression_to_type_string(&key_value.value);
                Some(format!("{name}: {value_type}"))
            }
            Prop::Shorthand(identifier) => {
                let name = identifier.sym.to_string();
                Some(format!("{name}: unknown"))
            }
            _ => None,
        }
    }

    #[allow(clippy::unused_self)]
    fn get_property_key_name(&self, key: &PropName) -> Option<String> {
        match key {
            PropName::Ident(identifier) => Some(identifier.sym.to_string()),
            PropName::Str(string) => Some(string.value.to_string_lossy().into_owned()),
            _ => None,
        }
    }

    #[allow(clippy::unused_self)]
    fn literal_to_type_string(&self, literal: &Lit) -> String {
        match literal {
            Lit::Str(_) | Lit::JSXText(_) => "string".to_string(),
            Lit::Num(_) => "number".to_string(),
            Lit::Bool(_) => "boolean".to_string(),
            Lit::Null(_) => "null".to_string(),
            Lit::BigInt(_) => "bigint".to_string(),
            Lit::Regex(_) => "RegExp".to_string(),
        }
    }

    fn find_return_expression<'a>(&self, body: &'a BlockStmt) -> Option<&'a Expr> {
        body.stmts
            .iter()
            .find_map(|statement| self.find_return_in_statement(statement))
    }

    fn find_return_in_statement<'a>(&self, statement: &'a Stmt) -> Option<&'a Expr> {
        match statement {
            Stmt::Return(ReturnStmt {
                arg: Some(argument),
                ..
            }) => Some(argument),
            Stmt::Block(block) => self.find_return_expression(block),
            Stmt::If(if_statement) => self.find_return_in_if_statement(if_statement),
            Stmt::Try(try_statement) => self.find_return_in_try_statement(try_statement),
            _ => None,
        }
    }

    fn find_return_in_if_statement<'a>(
        &self,
        if_statement: &'a swc_ecma_ast::IfStmt,
    ) -> Option<&'a Expr> {
        self.find_return_in_statement(&if_statement.cons)
            .or_else(|| {
                if_statement
                    .alt
                    .as_ref()
                    .and_then(|alt| self.find_return_in_statement(alt))
            })
    }

    fn find_return_in_try_statement<'a>(
        &self,
        try_statement: &'a swc_ecma_ast::TryStmt,
    ) -> Option<&'a Expr> {
        self.find_return_expression(&try_statement.block)
            .or_else(|| {
                try_statement
                    .handler
                    .as_ref()
                    .and_then(|catch| self.find_return_expression(&catch.body))
            })
    }
}

#[must_use]
pub fn extract_context(parsed_file: &ParsedFile, context_class_name: &str) -> Option<ContextInfo> {
    ContextParser::new().extract_context(parsed_file, context_class_name)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::parser::TsParser;
    use std::fs;
    use tempfile::TempDir;

    fn create_temp_file(content: &str) -> (TempDir, PathBuf) {
        let temp_directory = TempDir::new().expect("Failed to create temp dir");
        let file_path = temp_directory.path().join("app.context.ts");
        fs::write(&file_path, content).expect("Failed to write test file");
        (temp_directory, file_path)
    }

    fn parse_and_extract(source: &str, class_name: &str) -> Option<ContextInfo> {
        let (_temp, path) = create_temp_file(source);
        let parser = TsParser::new();
        let parsed = parser.parse_file(&path).expect("Failed to parse");
        ContextParser::new().extract_context(&parsed, class_name)
    }

    #[test]
    fn test_extract_context_with_object_return() {
        let source = r"
            import { Injectable } from '@nestjs/common';
            import { ContextOptions, TRPCContext } from 'nestjs-trpc';

            @Injectable()
            export class AppContext implements TRPCContext {
                async create(opts: ContextOptions): Promise<Record<string, unknown>> {
                    return {
                        req: opts.req,
                        auth: {
                            user: { id: '1', name: 'Test' },
                        },
                    };
                }
            }
        ";

        let info = parse_and_extract(source, "AppContext");
        assert!(info.is_some());

        let info = info.unwrap();
        assert_eq!(info.class_name, "AppContext");
        assert!(info.return_type.contains("req: unknown"));
        assert!(info
            .return_type
            .contains("auth: { user: { id: string; name: string } }"));
    }

    #[test]
    fn test_extract_context_simple_return() {
        let source = r"
            export class SimpleContext {
                async create(opts: any) {
                    return { userId: '123' };
                }
            }
        ";

        let info = parse_and_extract(source, "SimpleContext");
        assert!(info.is_some());

        let info = info.unwrap();
        assert_eq!(info.class_name, "SimpleContext");
        assert!(info.return_type.contains("userId: string"));
    }

    #[test]
    fn test_extract_context_class_not_found() {
        let source = r"
            export class SomeOtherClass {
                async create(opts: any) {
                    return {};
                }
            }
        ";

        let info = parse_and_extract(source, "AppContext");
        assert!(info.is_none());
    }

    #[test]
    fn test_extract_context_no_create_method() {
        let source = r"
            export class AppContext {
                async initialize(opts: any) {
                    return {};
                }
            }
        ";

        let info = parse_and_extract(source, "AppContext");
        assert!(info.is_none());
    }

    #[test]
    fn test_extract_context_non_exported() {
        let source = r"
            class AppContext {
                async create(opts: any) {
                    return { private: true };
                }
            }
        ";

        let info = parse_and_extract(source, "AppContext");
        assert!(info.is_some());
        assert!(info.unwrap().return_type.contains("private: boolean"));
    }

    #[test]
    fn test_convenience_function() {
        let source = r"
            export class AppContext {
                async create() {
                    return { test: true };
                }
            }
        ";

        let (_temp, path) = create_temp_file(source);
        let parser = TsParser::new();
        let parsed = parser.parse_file(&path).expect("Failed to parse");

        let info = extract_context(&parsed, "AppContext");
        assert!(info.is_some());
    }
}
