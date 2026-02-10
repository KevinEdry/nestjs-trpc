use crate::parser::ParsedFile;
use std::path::PathBuf;
use swc_ecma_ast::{
    CallExpr, Callee, Class, Decl, Decorator, Expr, ExprOrSpread, Lit, MemberExpr, MemberProp,
    ModuleDecl, ModuleItem, ObjectLit, Prop, PropName, PropOrSpread, Stmt,
};
use tracing::{debug, trace};

#[derive(Debug, Clone, Default)]
pub struct TrpcModuleOptions {
    pub context_class_name: Option<String>,
    pub auto_schema_file: Option<String>,
    pub transformer_identifier: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct TransformerInfo {
    pub package_name: String,
    pub import_name: String,
    pub is_default_import: bool,
}

fn extract_class_from_module_item(item: &ModuleItem) -> Option<&Class> {
    match item {
        ModuleItem::ModuleDecl(ModuleDecl::ExportDecl(export_declaration)) => {
            let Decl::Class(class_declaration) = &export_declaration.decl else {
                return None;
            };
            Some(&class_declaration.class)
        }
        ModuleItem::Stmt(Stmt::Decl(Decl::Class(class_declaration))) => {
            Some(&class_declaration.class)
        }
        _ => None,
    }
}

fn extract_imports_array(property: &PropOrSpread) -> Option<&[Option<ExprOrSpread>]> {
    let PropOrSpread::Prop(property_box) = property else {
        return None;
    };
    let Prop::KeyValue(key_value) = &**property_box else {
        return None;
    };

    let is_imports_key = is_property_named(&key_value.key, "imports");
    if !is_imports_key {
        return None;
    }

    let Expr::Array(array_literal) = &*key_value.value else {
        return None;
    };

    Some(array_literal.elems.as_slice())
}

fn is_property_named(key: &PropName, expected_name: &str) -> bool {
    match key {
        PropName::Ident(identifier) => identifier.sym.as_ref() == expected_name,
        PropName::Str(string) => string.value.to_string_lossy() == expected_name,
        _ => false,
    }
}

#[derive(Debug, Clone, Default)]
pub struct ModuleParser;

impl ModuleParser {
    #[must_use]
    pub const fn new() -> Self {
        Self
    }

    pub fn extract_trpc_options(&self, parsed_file: &ParsedFile) -> Option<TrpcModuleOptions> {
        debug!(path = ?parsed_file.file_path, "Extracting TRPC module options");

        let options = parsed_file
            .module
            .body
            .iter()
            .find_map(|item| self.extract_from_module_item(item));

        if let Some(ref options) = options {
            debug!(
                context = ?options.context_class_name,
                auto_schema = ?options.auto_schema_file,
                "Found TRPC module options"
            );
        } else {
            debug!(path = ?parsed_file.file_path, "No TRPC module options found");
        }

        options
    }

    fn extract_from_module_item(&self, item: &ModuleItem) -> Option<TrpcModuleOptions> {
        let decorators = self.extract_class_decorators(item)?;
        self.extract_from_class_decorators(decorators)
    }

    #[allow(clippy::unused_self)]
    fn extract_class_decorators<'a>(&self, item: &'a ModuleItem) -> Option<&'a [Decorator]> {
        extract_class_from_module_item(item).map(|class| class.decorators.as_slice())
    }

    fn extract_from_class_decorators(&self, decorators: &[Decorator]) -> Option<TrpcModuleOptions> {
        decorators
            .iter()
            .find_map(|decorator| self.extract_from_decorator(decorator))
    }

    fn extract_from_decorator(&self, decorator: &Decorator) -> Option<TrpcModuleOptions> {
        let Expr::Call(call_expression) = &*decorator.expr else {
            return None;
        };

        let is_module_decorator = self.is_module_call(call_expression);
        if !is_module_decorator {
            return None;
        }

        trace!("Found @Module decorator");
        self.extract_trpc_from_module_options(call_expression)
    }

    #[allow(clippy::unused_self)]
    fn is_module_call(&self, call_expression: &CallExpr) -> bool {
        let Callee::Expr(callee_expression) = &call_expression.callee else {
            return false;
        };

        matches!(&**callee_expression, Expr::Ident(identifier) if identifier.sym.as_ref() == "Module")
    }

    fn extract_trpc_from_module_options(
        &self,
        call_expression: &CallExpr,
    ) -> Option<TrpcModuleOptions> {
        let first_argument = call_expression.args.first()?;
        let Expr::Object(module_options) = &*first_argument.expr else {
            return None;
        };

        let imports_array = self.find_imports_property(module_options)?;
        self.find_trpc_module_in_imports(imports_array)
    }

    #[allow(clippy::unused_self)]
    fn find_imports_property<'a>(
        &self,
        object: &'a ObjectLit,
    ) -> Option<&'a [Option<ExprOrSpread>]> {
        object
            .props
            .iter()
            .find_map(|property| extract_imports_array(property))
    }

    fn find_trpc_module_in_imports(
        &self,
        imports: &[Option<ExprOrSpread>],
    ) -> Option<TrpcModuleOptions> {
        imports
            .iter()
            .flatten()
            .find_map(|import_element| self.extract_trpc_for_root(&import_element.expr))
    }

    fn extract_trpc_for_root(&self, expression: &Expr) -> Option<TrpcModuleOptions> {
        let Expr::Call(call_expression) = expression else {
            return None;
        };

        let is_trpc_for_root = self.is_trpc_module_for_root_call(call_expression);
        if !is_trpc_for_root {
            return None;
        }

        trace!("Found TRPCModule.forRoot() call");
        self.extract_options_from_for_root(call_expression)
    }

    fn is_trpc_module_for_root_call(&self, call_expression: &CallExpr) -> bool {
        let Callee::Expr(callee_expression) = &call_expression.callee else {
            return false;
        };

        let Expr::Member(member_expression) = &**callee_expression else {
            return false;
        };

        self.is_trpc_module_member(member_expression)
    }

    #[allow(clippy::unused_self)]
    fn is_trpc_module_member(&self, member: &MemberExpr) -> bool {
        let Expr::Ident(object_identifier) = &*member.obj else {
            return false;
        };

        let is_trpc_module = object_identifier.sym.as_ref() == "TRPCModule";
        if !is_trpc_module {
            return false;
        }

        let MemberProp::Ident(property_identifier) = &member.prop else {
            return false;
        };

        property_identifier.sym.as_ref() == "forRoot"
    }

    fn extract_options_from_for_root(
        &self,
        call_expression: &CallExpr,
    ) -> Option<TrpcModuleOptions> {
        let first_argument = call_expression.args.first()?;
        let Expr::Object(options_object) = &*first_argument.expr else {
            return None;
        };

        let mut result = TrpcModuleOptions::default();

        options_object
            .props
            .iter()
            .filter_map(|property| self.extract_key_value_property(property))
            .for_each(|key_value| self.extract_option_value(key_value, &mut result));

        Some(result)
    }

    #[allow(clippy::unused_self)]
    fn extract_key_value_property<'a>(
        &self,
        property: &'a PropOrSpread,
    ) -> Option<&'a swc_ecma_ast::KeyValueProp> {
        let PropOrSpread::Prop(property_box) = property else {
            return None;
        };
        let Prop::KeyValue(key_value) = &**property_box else {
            return None;
        };
        Some(key_value)
    }

    fn extract_option_value(
        &self,
        key_value: &swc_ecma_ast::KeyValueProp,
        result: &mut TrpcModuleOptions,
    ) {
        let Some(key_name) = self.get_property_key_name(&key_value.key) else {
            return;
        };

        match key_name.as_str() {
            "context" => self.extract_context_option(key_value, result),
            "autoSchemaFile" => self.extract_auto_schema_option(key_value, result),
            "transformer" => self.extract_transformer_option(key_value, result),
            _ => {}
        }
    }

    #[allow(clippy::unused_self)]
    fn extract_context_option(
        &self,
        key_value: &swc_ecma_ast::KeyValueProp,
        result: &mut TrpcModuleOptions,
    ) {
        let Expr::Ident(identifier) = &*key_value.value else {
            return;
        };
        result.context_class_name = Some(identifier.sym.to_string());
        trace!(context = %identifier.sym, "Found context class name");
    }

    #[allow(clippy::unused_self)]
    fn extract_auto_schema_option(
        &self,
        key_value: &swc_ecma_ast::KeyValueProp,
        result: &mut TrpcModuleOptions,
    ) {
        let Expr::Lit(Lit::Str(string)) = &*key_value.value else {
            return;
        };
        let auto_schema_value = string.value.to_string_lossy().into_owned();
        trace!(auto_schema = %auto_schema_value, "Found autoSchemaFile");
        result.auto_schema_file = Some(auto_schema_value);
    }

    #[allow(clippy::unused_self)]
    fn extract_transformer_option(
        &self,
        key_value: &swc_ecma_ast::KeyValueProp,
        result: &mut TrpcModuleOptions,
    ) {
        let Expr::Ident(identifier) = &*key_value.value else {
            return;
        };
        result.transformer_identifier = Some(identifier.sym.to_string());
        trace!(transformer = %identifier.sym, "Found transformer identifier");
    }

    #[allow(clippy::unused_self)]
    fn get_property_key_name(&self, key: &PropName) -> Option<String> {
        match key {
            PropName::Ident(identifier) => Some(identifier.sym.to_string()),
            PropName::Str(string) => Some(string.value.to_string_lossy().into_owned()),
            _ => None,
        }
    }
}

#[must_use]
pub fn extract_trpc_options(parsed_file: &ParsedFile) -> Option<TrpcModuleOptions> {
    ModuleParser::new().extract_trpc_options(parsed_file)
}

pub fn resolve_context_file(parsed_file: &ParsedFile, context_class_name: &str) -> Option<PathBuf> {
    let source_directory = parsed_file.file_path.parent()?;

    let resolved = parsed_file
        .module
        .body
        .iter()
        .find_map(|item| find_context_import(item, context_class_name, source_directory));

    if let Some(ref path) = resolved {
        trace!(
            context = %context_class_name,
            path = ?path,
            "Resolved context file"
        );
    }

    resolved
}

#[must_use]
pub fn resolve_transformer_import(
    parsed_file: &ParsedFile,
    transformer_identifier: &str,
) -> Option<TransformerInfo> {
    let resolved = parsed_file
        .module
        .body
        .iter()
        .find_map(|item| find_transformer_import(item, transformer_identifier));

    if let Some(ref info) = resolved {
        trace!(
            transformer = %transformer_identifier,
            package = %info.package_name,
            default = info.is_default_import,
            "Resolved transformer import"
        );
    }

    resolved
}

fn find_transformer_import(
    item: &ModuleItem,
    transformer_identifier: &str,
) -> Option<TransformerInfo> {
    use swc_ecma_ast::ImportSpecifier;

    let ModuleItem::ModuleDecl(ModuleDecl::Import(import_declaration)) = item else {
        return None;
    };

    let is_default_import =
        import_declaration
            .specifiers
            .iter()
            .find_map(|specifier| match specifier {
                ImportSpecifier::Default(default_specifier)
                    if default_specifier.local.sym.as_ref() == transformer_identifier =>
                {
                    Some(true)
                }
                ImportSpecifier::Named(named_specifier)
                    if named_specifier.local.sym.as_ref() == transformer_identifier =>
                {
                    Some(false)
                }
                _ => None,
            })?;

    Some(TransformerInfo {
        package_name: import_declaration.src.value.to_string_lossy().into_owned(),
        import_name: transformer_identifier.to_string(),
        is_default_import,
    })
}

fn find_context_import(
    item: &ModuleItem,
    context_class_name: &str,
    source_directory: &std::path::Path,
) -> Option<PathBuf> {
    use swc_ecma_ast::ImportSpecifier;

    let ModuleItem::ModuleDecl(ModuleDecl::Import(import_declaration)) = item else {
        return None;
    };

    let module_specifier = import_declaration.src.value.to_string_lossy();
    if !module_specifier.starts_with('.') {
        return None;
    }

    let has_matching_specifier = import_declaration.specifiers.iter().any(|specifier| {
        let ImportSpecifier::Named(named) = specifier else {
            return false;
        };
        named.local.sym.as_ref() == context_class_name
    });

    if !has_matching_specifier {
        return None;
    }

    crate::parser::imports::module_path::resolve_module_path(source_directory, &module_specifier)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::parser::TsParser;
    use std::fs;
    use tempfile::TempDir;

    fn create_temp_file(content: &str) -> (TempDir, PathBuf) {
        let temp_directory = TempDir::new().expect("Failed to create temp dir");
        let file_path = temp_directory.path().join("app.module.ts");
        fs::write(&file_path, content).expect("Failed to write test file");
        (temp_directory, file_path)
    }

    fn parse_and_extract(source: &str) -> Option<TrpcModuleOptions> {
        let (_temp, path) = create_temp_file(source);
        let parser = TsParser::new();
        let parsed = parser.parse_file(&path).expect("Failed to parse");
        ModuleParser::new().extract_trpc_options(&parsed)
    }

    #[test]
    fn test_extract_trpc_options_with_context() {
        let source = r"
            import { Module } from '@nestjs/common';
            import { TRPCModule } from 'nestjs-trpc';
            import { AppContext } from './app.context';

            @Module({
                imports: [
                    TRPCModule.forRoot({
                        autoSchemaFile: './src/@generated',
                        context: AppContext,
                    }),
                ],
            })
            export class AppModule {}
        ";

        let options = parse_and_extract(source);
        assert!(options.is_some());

        let options = options.unwrap();
        assert_eq!(options.context_class_name, Some("AppContext".to_string()));
        assert_eq!(
            options.auto_schema_file,
            Some("./src/@generated".to_string())
        );
    }

    #[test]
    fn test_extract_trpc_options_without_context() {
        let source = r"
            import { Module } from '@nestjs/common';
            import { TRPCModule } from 'nestjs-trpc';

            @Module({
                imports: [
                    TRPCModule.forRoot({
                        autoSchemaFile: './src/@generated',
                    }),
                ],
            })
            export class AppModule {}
        ";

        let options = parse_and_extract(source);
        assert!(options.is_some());

        let options = options.unwrap();
        assert_eq!(options.context_class_name, None);
        assert_eq!(
            options.auto_schema_file,
            Some("./src/@generated".to_string())
        );
    }

    #[test]
    fn test_no_trpc_module() {
        let source = r"
            import { Module } from '@nestjs/common';

            @Module({
                imports: [],
            })
            export class AppModule {}
        ";

        let options = parse_and_extract(source);
        assert!(options.is_none());
    }

    #[test]
    fn test_module_with_multiple_imports() {
        let source = r"
            import { Module } from '@nestjs/common';
            import { TRPCModule } from 'nestjs-trpc';
            import { TypeOrmModule } from '@nestjs/typeorm';
            import { AppContext } from './app.context';

            @Module({
                imports: [
                    TypeOrmModule.forRoot({}),
                    TRPCModule.forRoot({
                        autoSchemaFile: './generated',
                        context: AppContext,
                    }),
                ],
            })
            export class AppModule {}
        ";

        let options = parse_and_extract(source);
        assert!(options.is_some());

        let options = options.unwrap();
        assert_eq!(options.context_class_name, Some("AppContext".to_string()));
    }

    #[test]
    fn test_non_exported_module() {
        let source = r"
            import { Module } from '@nestjs/common';
            import { TRPCModule } from 'nestjs-trpc';
            import { AppContext } from './app.context';

            @Module({
                imports: [
                    TRPCModule.forRoot({
                        context: AppContext,
                    }),
                ],
            })
            class AppModule {}
        ";

        let options = parse_and_extract(source);
        assert!(options.is_some());
        assert_eq!(
            options.unwrap().context_class_name,
            Some("AppContext".to_string())
        );
    }

    #[test]
    fn test_resolve_context_file() {
        let temp_directory = TempDir::new().expect("Failed to create temp dir");
        let base = temp_directory.path();

        fs::write(
            base.join("app.context.ts"),
            r"
            export class AppContext {}
        ",
        )
        .unwrap();

        let module_path = base.join("app.module.ts");
        fs::write(
            &module_path,
            r"
            import { Module } from '@nestjs/common';
            import { TRPCModule } from 'nestjs-trpc';
            import { AppContext } from './app.context';

            @Module({
                imports: [
                    TRPCModule.forRoot({
                        context: AppContext,
                    }),
                ],
            })
            export class AppModule {}
        ",
        )
        .unwrap();

        let parser = TsParser::new();
        let parsed = parser.parse_file(&module_path).expect("Failed to parse");

        let resolved = resolve_context_file(&parsed, "AppContext");
        assert!(resolved.is_some());
        assert!(resolved.unwrap().ends_with("app.context.ts"));
    }

    // ========================================================================
    // Additional Option propagation tests (TEST-02)
    // ========================================================================

    #[test]
    fn test_empty_module_returns_none() {
        let source = "";
        let options = parse_and_extract(source);
        assert!(options.is_none(), "Empty module should return None");
    }

    #[test]
    fn test_module_without_decorator_returns_none() {
        let source = r"
            export class AppModule {}
        ";

        let options = parse_and_extract(source);
        assert!(options.is_none(), "Class without @Module returns None");
    }

    #[test]
    fn test_module_with_empty_imports_returns_none() {
        let source = r"
            import { Module } from '@nestjs/common';

            @Module({
                imports: [],
            })
            export class AppModule {}
        ";

        let options = parse_and_extract(source);
        assert!(options.is_none(), "Empty imports array returns None");
    }

    #[test]
    fn test_module_with_non_trpc_imports_returns_none() {
        let source = r"
            import { Module } from '@nestjs/common';
            import { TypeOrmModule } from '@nestjs/typeorm';

            @Module({
                imports: [
                    TypeOrmModule.forRoot({}),
                ],
            })
            export class AppModule {}
        ";

        let options = parse_and_extract(source);
        assert!(options.is_none(), "Module without TRPCModule returns None");
    }

    #[test]
    fn test_trpc_module_with_empty_options() {
        let source = r"
            import { Module } from '@nestjs/common';
            import { TRPCModule } from 'nestjs-trpc';

            @Module({
                imports: [
                    TRPCModule.forRoot({}),
                ],
            })
            export class AppModule {}
        ";

        let options = parse_and_extract(source);
        assert!(
            options.is_some(),
            "TRPCModule.forRoot(empty) should return Some"
        );
        let opts = options.unwrap();
        assert!(opts.context_class_name.is_none());
        assert!(opts.auto_schema_file.is_none());
    }

    #[test]
    fn test_trpc_module_only_context() {
        let source = r"
            import { Module } from '@nestjs/common';
            import { TRPCModule } from 'nestjs-trpc';
            import { AppContext } from './app.context';

            @Module({
                imports: [
                    TRPCModule.forRoot({
                        context: AppContext,
                    }),
                ],
            })
            export class AppModule {}
        ";

        let options = parse_and_extract(source);
        assert!(options.is_some());
        let opts = options.unwrap();
        assert_eq!(opts.context_class_name, Some("AppContext".to_string()));
        assert!(opts.auto_schema_file.is_none());
    }

    #[test]
    fn test_trpc_module_only_auto_schema() {
        let source = r"
            import { Module } from '@nestjs/common';
            import { TRPCModule } from 'nestjs-trpc';

            @Module({
                imports: [
                    TRPCModule.forRoot({
                        autoSchemaFile: './generated',
                    }),
                ],
            })
            export class AppModule {}
        ";

        let options = parse_and_extract(source);
        assert!(options.is_some());
        let opts = options.unwrap();
        assert!(opts.context_class_name.is_none());
        assert_eq!(opts.auto_schema_file, Some("./generated".to_string()));
    }

    #[test]
    fn test_resolve_context_file_missing_import() {
        let temp_directory = TempDir::new().expect("Failed to create temp dir");
        let module_path = temp_directory.path().join("app.module.ts");

        fs::write(
            &module_path,
            r"
            import { Module } from '@nestjs/common';
            import { TRPCModule } from 'nestjs-trpc';

            @Module({
                imports: [
                    TRPCModule.forRoot({
                        context: UnimportedContext,
                    }),
                ],
            })
            export class AppModule {}
        ",
        )
        .unwrap();

        let parser = TsParser::new();
        let parsed = parser.parse_file(&module_path).expect("Failed to parse");

        let resolved = resolve_context_file(&parsed, "UnimportedContext");
        assert!(
            resolved.is_none(),
            "Should return None for unimported context"
        );
    }

    #[test]
    fn test_resolve_context_file_external_module() {
        let temp_directory = TempDir::new().expect("Failed to create temp dir");
        let module_path = temp_directory.path().join("app.module.ts");

        fs::write(
            &module_path,
            r"
            import { Module } from '@nestjs/common';
            import { TRPCModule } from 'nestjs-trpc';
            import { SomeContext } from 'some-external-package';

            @Module({
                imports: [
                    TRPCModule.forRoot({
                        context: SomeContext,
                    }),
                ],
            })
            export class AppModule {}
        ",
        )
        .unwrap();

        let parser = TsParser::new();
        let parsed = parser.parse_file(&module_path).expect("Failed to parse");

        let resolved = resolve_context_file(&parsed, "SomeContext");
        assert!(
            resolved.is_none(),
            "Should return None for external module imports"
        );
    }

    #[test]
    fn test_resolve_context_file_nonexistent_file() {
        let temp_directory = TempDir::new().expect("Failed to create temp dir");
        let module_path = temp_directory.path().join("app.module.ts");

        fs::write(
            &module_path,
            r"
            import { Module } from '@nestjs/common';
            import { TRPCModule } from 'nestjs-trpc';
            import { MissingContext } from './nonexistent.context';

            @Module({
                imports: [
                    TRPCModule.forRoot({
                        context: MissingContext,
                    }),
                ],
            })
            export class AppModule {}
        ",
        )
        .unwrap();

        let parser = TsParser::new();
        let parsed = parser.parse_file(&module_path).expect("Failed to parse");

        let resolved = resolve_context_file(&parsed, "MissingContext");
        assert!(
            resolved.is_none(),
            "Should return None when imported file doesn't exist"
        );
    }

    // ========================================================================
    // Transformer extraction tests
    // ========================================================================

    #[test]
    fn test_extract_transformer_identifier() {
        let source = r"
            import { Module } from '@nestjs/common';
            import { TRPCModule } from 'nestjs-trpc';
            import superjson from 'superjson';

            @Module({
                imports: [
                    TRPCModule.forRoot({
                        autoSchemaFile: './src/@generated',
                        transformer: superjson,
                    }),
                ],
            })
            export class AppModule {}
        ";

        let options = parse_and_extract(source);
        assert!(options.is_some());
        let options = options.unwrap();
        assert_eq!(
            options.transformer_identifier,
            Some("superjson".to_string())
        );
    }

    #[test]
    fn test_extract_transformer_with_context() {
        let source = r"
            import { Module } from '@nestjs/common';
            import { TRPCModule } from 'nestjs-trpc';
            import { AppContext } from './app.context';
            import superjson from 'superjson';

            @Module({
                imports: [
                    TRPCModule.forRoot({
                        autoSchemaFile: './src/@generated',
                        context: AppContext,
                        transformer: superjson,
                    }),
                ],
            })
            export class AppModule {}
        ";

        let options = parse_and_extract(source);
        assert!(options.is_some());
        let options = options.unwrap();
        assert_eq!(options.context_class_name, Some("AppContext".to_string()));
        assert_eq!(
            options.transformer_identifier,
            Some("superjson".to_string())
        );
    }

    #[test]
    fn test_no_transformer_returns_none() {
        let source = r"
            import { Module } from '@nestjs/common';
            import { TRPCModule } from 'nestjs-trpc';

            @Module({
                imports: [
                    TRPCModule.forRoot({
                        autoSchemaFile: './src/@generated',
                    }),
                ],
            })
            export class AppModule {}
        ";

        let options = parse_and_extract(source);
        assert!(options.is_some());
        assert!(options.unwrap().transformer_identifier.is_none());
    }

    #[test]
    fn test_resolve_transformer_default_import() {
        let (_temp, path) = create_temp_file(
            r"
            import { Module } from '@nestjs/common';
            import { TRPCModule } from 'nestjs-trpc';
            import superjson from 'superjson';

            @Module({
                imports: [
                    TRPCModule.forRoot({
                        transformer: superjson,
                    }),
                ],
            })
            export class AppModule {}
        ",
        );

        let parser = TsParser::new();
        let parsed = parser.parse_file(&path).expect("Failed to parse");

        let info = resolve_transformer_import(&parsed, "superjson");
        assert!(info.is_some());
        let info = info.unwrap();
        assert_eq!(info.package_name, "superjson");
        assert_eq!(info.import_name, "superjson");
        assert!(info.is_default_import);
    }

    #[test]
    fn test_resolve_transformer_named_import() {
        let (_temp, path) = create_temp_file(
            r"
            import { Module } from '@nestjs/common';
            import { TRPCModule } from 'nestjs-trpc';
            import { myTransformer } from 'custom-transformer';

            @Module({
                imports: [
                    TRPCModule.forRoot({
                        transformer: myTransformer,
                    }),
                ],
            })
            export class AppModule {}
        ",
        );

        let parser = TsParser::new();
        let parsed = parser.parse_file(&path).expect("Failed to parse");

        let info = resolve_transformer_import(&parsed, "myTransformer");
        assert!(info.is_some());
        let info = info.unwrap();
        assert_eq!(info.package_name, "custom-transformer");
        assert_eq!(info.import_name, "myTransformer");
        assert!(!info.is_default_import);
    }

    #[test]
    fn test_resolve_transformer_not_imported() {
        let (_temp, path) = create_temp_file(
            r"
            import { Module } from '@nestjs/common';
            import { TRPCModule } from 'nestjs-trpc';

            @Module({
                imports: [
                    TRPCModule.forRoot({
                        transformer: nonExistent,
                    }),
                ],
            })
            export class AppModule {}
        ",
        );

        let parser = TsParser::new();
        let parsed = parser.parse_file(&path).expect("Failed to parse");

        let info = resolve_transformer_import(&parsed, "nonExistent");
        assert!(info.is_none());
    }
}
