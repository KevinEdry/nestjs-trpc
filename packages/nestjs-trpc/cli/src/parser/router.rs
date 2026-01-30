use crate::parser::ParsedFile;
use std::path::{Path, PathBuf};
use swc_ecma_ast::{
    CallExpr, Callee, Class, Decl, Decorator, Expr, ExprOrSpread, Lit, ModuleDecl, ModuleItem,
    ObjectLit, Prop, PropName, PropOrSpread, Stmt,
};
use tracing::{debug, trace};

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct RouterInfo {
    pub class_name: String,

    pub alias: Option<String>,

    pub file_path: PathBuf,
}

#[derive(Debug, Clone, Default)]
pub struct RouterParser;

impl RouterParser {
    #[must_use]
    pub const fn new() -> Self {
        Self
    }

    pub fn extract_routers(&self, parsed_file: &ParsedFile) -> Vec<RouterInfo> {
        debug!(path = ?parsed_file.file_path, "Extracting routers from file");

        let routers: Vec<RouterInfo> = parsed_file
            .module
            .body
            .iter()
            .filter_map(|item| {
                let router_info = Self::extract_router_from_item(item, &parsed_file.file_path)?;
                debug!(
                    class = %router_info.class_name,
                    alias = ?router_info.alias,
                    "Found router class"
                );
                Some(router_info)
            })
            .collect();

        debug!(
            path = ?parsed_file.file_path,
            count = routers.len(),
            "Extracted routers"
        );

        routers
    }

    fn extract_router_from_item(item: &ModuleItem, file_path: &Path) -> Option<RouterInfo> {
        match item {
            ModuleItem::ModuleDecl(ModuleDecl::ExportDecl(export_declaration)) => {
                Self::extract_from_export_declaration(&export_declaration.decl, file_path)
            }
            ModuleItem::Stmt(Stmt::Decl(Decl::Class(class_declaration))) => {
                Self::extract_router_from_class(
                    &class_declaration.ident.sym,
                    &class_declaration.class,
                    file_path,
                )
            }
            ModuleItem::ModuleDecl(ModuleDecl::ExportDefaultDecl(export_default)) => {
                Self::extract_from_default_export(&export_default.decl, file_path)
            }
            _ => None,
        }
    }

    fn extract_from_export_declaration(declaration: &Decl, file_path: &Path) -> Option<RouterInfo> {
        let Decl::Class(class_declaration) = declaration else {
            return None;
        };

        Self::extract_router_from_class(
            &class_declaration.ident.sym,
            &class_declaration.class,
            file_path,
        )
    }

    fn extract_from_default_export(
        declaration: &swc_ecma_ast::DefaultDecl,
        file_path: &Path,
    ) -> Option<RouterInfo> {
        let swc_ecma_ast::DefaultDecl::Class(class_expression) = declaration else {
            return None;
        };

        let class_name = class_expression.ident.as_ref().map_or_else(
            || "default".to_string(),
            |identifier| identifier.sym.to_string(),
        );

        Self::extract_router_from_class(&class_name, &class_expression.class, file_path)
    }

    fn extract_router_from_class(
        class_name: &str,
        class: &Class,
        file_path: &Path,
    ) -> Option<RouterInfo> {
        trace!(class = %class_name, "Checking class for @Router decorator");

        class
            .decorators
            .iter()
            .find_map(Self::extract_router_decorator_info)
            .map(|alias| RouterInfo {
                class_name: class_name.to_string(),
                alias,
                file_path: file_path.to_path_buf(),
            })
    }

    #[allow(clippy::option_option)] // Intentional: None=not Router, Some(None)=no alias, Some(Some)=alias
    fn extract_router_decorator_info(decorator: &Decorator) -> Option<Option<String>> {
        match &*decorator.expr {
            Expr::Call(call_expr) => Self::extract_from_call_expr(call_expr),
            Expr::Ident(ident) if ident.sym.as_ref() == "Router" => {
                trace!("Found @Router decorator without arguments");
                Some(None)
            }
            _ => None,
        }
    }

    #[allow(clippy::option_option)]
    fn extract_from_call_expr(call_expression: &CallExpr) -> Option<Option<String>> {
        let is_router_call = Self::is_router_callee(&call_expression.callee);

        if !is_router_call {
            return None;
        }

        trace!("Found @Router() call expression");

        if call_expression.args.is_empty() {
            return Some(None);
        }

        let first_argument = &call_expression.args[0];
        Some(Self::extract_alias_from_argument(first_argument))
    }

    fn is_router_callee(callee: &Callee) -> bool {
        let Callee::Expr(expression) = callee else {
            return false;
        };

        let Expr::Ident(identifier) = &**expression else {
            return false;
        };

        identifier.sym.as_ref() == "Router"
    }

    fn extract_alias_from_argument(argument: &ExprOrSpread) -> Option<String> {
        let Expr::Object(object_literal) = &*argument.expr else {
            return None;
        };

        Self::extract_alias_from_object(object_literal)
    }

    fn extract_alias_from_object(object: &ObjectLit) -> Option<String> {
        object
            .props
            .iter()
            .filter_map(extract_property_box)
            .find_map(extract_alias_from_property)
    }
}

fn extract_property_box(property_or_spread: &PropOrSpread) -> Option<&Prop> {
    let PropOrSpread::Prop(property) = property_or_spread else {
        return None;
    };
    Some(property)
}

fn extract_alias_from_property(property: &Prop) -> Option<String> {
    match property {
        Prop::KeyValue(key_value) => extract_alias_from_key_value(key_value),
        Prop::Shorthand(identifier) if identifier.sym.as_ref() == "alias" => {
            trace!("Found shorthand alias property (variable reference)");
            None
        }
        _ => None,
    }
}

fn extract_alias_from_key_value(key_value: &swc_ecma_ast::KeyValueProp) -> Option<String> {
    let is_alias_key = is_alias_key(&key_value.key);
    if !is_alias_key {
        return None;
    }
    extract_string_value(&key_value.value)
}

fn is_alias_key(key: &PropName) -> bool {
    match key {
        PropName::Ident(ident) => &*ident.sym == "alias",
        PropName::Str(s) => &*s.value.to_string_lossy() == "alias",
        _ => false,
    }
}

fn extract_string_value(expr: &Expr) -> Option<String> {
    match expr {
        Expr::Lit(Lit::Str(s)) => {
            let value = s.value.to_string_lossy().into_owned();
            trace!(alias = %value, "Extracted alias value");
            Some(value)
        }
        Expr::Tpl(tpl) if tpl.exprs.is_empty() && tpl.quasis.len() == 1 => {
            let value = tpl.quasis[0].raw.to_string();
            trace!(alias = %value, "Extracted alias from template literal");
            Some(value)
        }
        _ => {
            trace!("Alias is not a string literal");
            None
        }
    }
}

#[must_use]
pub fn extract_routers(parsed_file: &ParsedFile) -> Vec<RouterInfo> {
    RouterParser::new().extract_routers(parsed_file)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::parser::TsParser;
    use std::fs;
    use tempfile::TempDir;

    fn create_temp_file(content: &str) -> (TempDir, PathBuf) {
        let temp_dir = TempDir::new().expect("Failed to create temp dir");
        let file_path = temp_dir.path().join("test.router.ts");
        fs::write(&file_path, content).expect("Failed to write test file");
        (temp_dir, file_path)
    }

    fn parse_and_extract(source: &str) -> Vec<RouterInfo> {
        let (_temp, path) = create_temp_file(source);
        let parser = TsParser::new();
        let parsed = parser.parse_file(&path).expect("Failed to parse");
        RouterParser::new().extract_routers(&parsed)
    }

    #[test]
    fn test_router_parser_creation() {
        let parser = RouterParser::new();
        assert_eq!(std::mem::size_of_val(&parser), 0);
    }

    #[test]
    fn test_router_parser_default() {
        let parser = RouterParser;
        assert_eq!(std::mem::size_of_val(&parser), 0);
    }

    #[test]
    fn test_extract_router_with_alias() {
        let source = r"
            function Router(opts?: { alias?: string }): ClassDecorator {
                return (target) => target;
            }

            @Router({ alias: 'users' })
            export class UserRouter {
                constructor() {}
            }
        ";

        let routers = parse_and_extract(source);

        assert_eq!(routers.len(), 1);
        assert_eq!(routers[0].class_name, "UserRouter");
        assert_eq!(routers[0].alias, Some("users".to_string()));
    }

    #[test]
    fn test_extract_router_without_alias() {
        let source = r"
            function Router(opts?: { alias?: string }): ClassDecorator {
                return (target) => target;
            }

            @Router()
            export class UserRouter {
                constructor() {}
            }
        ";

        let routers = parse_and_extract(source);

        assert_eq!(routers.len(), 1);
        assert_eq!(routers[0].class_name, "UserRouter");
        assert_eq!(routers[0].alias, None);
    }

    #[test]
    fn test_extract_router_no_parentheses() {
        let source = r"
            function Router(target: any): any {
                return target;
            }

            @Router
            export class UserRouter {
                constructor() {}
            }
        ";

        let routers = parse_and_extract(source);

        assert_eq!(routers.len(), 1);
        assert_eq!(routers[0].class_name, "UserRouter");
        assert_eq!(routers[0].alias, None);
    }

    #[test]
    fn test_extract_router_non_exported() {
        let source = r"
            function Router(opts?: { alias?: string }): ClassDecorator {
                return (target) => target;
            }

            @Router({ alias: 'internal' })
            class InternalRouter {
                constructor() {}
            }
        ";

        let routers = parse_and_extract(source);

        assert_eq!(routers.len(), 1);
        assert_eq!(routers[0].class_name, "InternalRouter");
        assert_eq!(routers[0].alias, Some("internal".to_string()));
    }

    #[test]
    fn test_extract_multiple_routers() {
        let source = r"
            function Router(opts?: { alias?: string }): ClassDecorator {
                return (target) => target;
            }

            @Router({ alias: 'users' })
            export class UserRouter {}

            @Router({ alias: 'posts' })
            export class PostRouter {}

            @Router()
            export class CommentRouter {}
        ";

        let routers = parse_and_extract(source);

        assert_eq!(routers.len(), 3);

        let user_router = routers.iter().find(|r| r.class_name == "UserRouter");
        assert!(user_router.is_some());
        assert_eq!(user_router.unwrap().alias, Some("users".to_string()));

        let post_router = routers.iter().find(|r| r.class_name == "PostRouter");
        assert!(post_router.is_some());
        assert_eq!(post_router.unwrap().alias, Some("posts".to_string()));

        let comment_router = routers.iter().find(|r| r.class_name == "CommentRouter");
        assert!(comment_router.is_some());
        assert_eq!(comment_router.unwrap().alias, None);
    }

    #[test]
    fn test_ignore_non_router_decorators() {
        let source = r"
            function Injectable(): ClassDecorator {
                return (target) => target;
            }

            function Controller(path: string): ClassDecorator {
                return (target) => target;
            }

            @Injectable()
            @Controller('/users')
            export class UserController {}
        ";

        let routers = parse_and_extract(source);

        assert_eq!(routers.len(), 0);
    }

    #[test]
    fn test_no_routers_in_file() {
        let source = r"
            export class PlainClass {
                constructor() {}
            }

            export const value = 42;

            export function helper() {}
        ";

        let routers = parse_and_extract(source);

        assert_eq!(routers.len(), 0);
    }

    #[test]
    fn test_router_with_other_decorators() {
        let source = r"
            function Router(opts?: { alias?: string }): ClassDecorator {
                return (target) => target;
            }

            function Injectable(): ClassDecorator {
                return (target) => target;
            }

            @Injectable()
            @Router({ alias: 'users' })
            export class UserRouter {}
        ";

        let routers = parse_and_extract(source);

        assert_eq!(routers.len(), 1);
        assert_eq!(routers[0].class_name, "UserRouter");
        assert_eq!(routers[0].alias, Some("users".to_string()));
    }

    #[test]
    fn test_router_with_empty_object() {
        let source = r"
            function Router(opts?: { alias?: string }): ClassDecorator {
                return (target) => target;
            }

            @Router({})
            export class UserRouter {}
        ";

        let routers = parse_and_extract(source);

        assert_eq!(routers.len(), 1);
        assert_eq!(routers[0].class_name, "UserRouter");
        assert_eq!(routers[0].alias, None);
    }

    #[test]
    fn test_router_with_string_key() {
        let source = r"
            function Router(opts?: { alias?: string }): ClassDecorator {
                return (target) => target;
            }

            @Router({ 'alias': 'quoted' })
            export class UserRouter {}
        ";

        let routers = parse_and_extract(source);

        assert_eq!(routers.len(), 1);
        assert_eq!(routers[0].alias, Some("quoted".to_string()));
    }

    #[test]
    fn test_extract_routers_convenience_function() {
        let source = r"
            function Router(opts?: { alias?: string }): ClassDecorator {
                return (target) => target;
            }

            @Router({ alias: 'test' })
            export class TestRouter {}
        ";

        let (_temp, path) = create_temp_file(source);
        let parser = TsParser::new();
        let parsed = parser.parse_file(&path).expect("Failed to parse");

        let routers = extract_routers(&parsed);

        assert_eq!(routers.len(), 1);
        assert_eq!(routers[0].class_name, "TestRouter");
    }

    #[test]
    fn test_router_info_equality() {
        let info1 = RouterInfo {
            class_name: "Test".to_string(),
            alias: Some("test".to_string()),
            file_path: PathBuf::from("test.ts"),
        };
        let info2 = RouterInfo {
            class_name: "Test".to_string(),
            alias: Some("test".to_string()),
            file_path: PathBuf::from("test.ts"),
        };
        assert_eq!(info1, info2);
    }

    #[test]
    fn test_router_info_clone() {
        let info = RouterInfo {
            class_name: "Test".to_string(),
            alias: Some("test".to_string()),
            file_path: PathBuf::from("test.ts"),
        };
        let cloned = info.clone();
        assert_eq!(info, cloned);
    }

    #[test]
    fn test_router_info_debug() {
        let info = RouterInfo {
            class_name: "Test".to_string(),
            alias: Some("test".to_string()),
            file_path: PathBuf::from("test.ts"),
        };
        let debug_str = format!("{info:?}");
        assert!(debug_str.contains("Test"));
        assert!(debug_str.contains("test"));
    }

    #[test]
    fn test_complex_router_file() {
        let source = r"
            import { Inject } from '@nestjs/common';
            import { Router, Query, Mutation } from 'nestjs-trpc';
            import { z } from 'zod';

            @Router({ alias: 'users' })
            export class UserRouter {
                constructor(
                    @Inject('UserService') private readonly userService: any
                ) {}

                @Query({
                    input: z.object({ userId: z.string() }),
                    output: z.object({ name: z.string() }),
                })
                async getUserById(userId: string): Promise<any> {
                    return this.userService.getUser(userId);
                }

                @Mutation({
                    input: z.object({ name: z.string() }),
                })
                async createUser(input: any): Promise<any> {
                    return this.userService.createUser(input);
                }
            }
        ";

        let routers = parse_and_extract(source);

        assert_eq!(routers.len(), 1);
        assert_eq!(routers[0].class_name, "UserRouter");
        assert_eq!(routers[0].alias, Some("users".to_string()));
    }

    #[test]
    fn test_router_with_other_properties() {
        let source = r"
            function Router(opts?: { alias?: string; version?: number }): ClassDecorator {
                return (target) => target;
            }

            @Router({ alias: 'users', version: 2 })
            export class UserRouter {}
        ";

        let routers = parse_and_extract(source);

        assert_eq!(routers.len(), 1);
        assert_eq!(routers[0].alias, Some("users".to_string()));
    }

    #[test]
    fn test_export_default_class_with_router() {
        let source = r"
            function Router(opts?: { alias?: string }): ClassDecorator {
                return (target) => target;
            }

            @Router({ alias: 'default' })
            export default class DefaultRouter {}
        ";

        let routers = parse_and_extract(source);

        assert_eq!(routers.len(), 1);
        assert_eq!(routers[0].class_name, "DefaultRouter");
        assert_eq!(routers[0].alias, Some("default".to_string()));
    }
}
