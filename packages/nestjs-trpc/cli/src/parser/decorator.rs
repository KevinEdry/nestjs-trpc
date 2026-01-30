use crate::parser::ParsedFile;
use crate::ProcedureType;
use swc_ecma_ast::{
    CallExpr, Callee, Decorator, Expr, ExprOrSpread, ObjectLit, Prop, PropName, PropOrSpread,
};
use tracing::{debug, trace, warn};

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ProcedureDecoratorInfo {
    pub procedure_type: ProcedureType,
    pub input: Option<String>,
    pub output: Option<String>,
    pub input_ref: Option<String>,
    pub output_ref: Option<String>,
}

#[derive(Debug, Clone, Default)]
pub struct DecoratorArguments {
    pub input: Option<String>,
    pub output: Option<String>,
    pub input_ref: Option<String>,
    pub output_ref: Option<String>,
}

#[derive(Debug, Clone, Default)]
pub struct DecoratorParser;

impl DecoratorParser {
    #[must_use]
    pub const fn new() -> Self {
        Self
    }

    #[must_use]
    pub fn extract_procedure_decorators(
        &self,
        decorators: &[Decorator],
        parsed_file: &ParsedFile,
    ) -> Vec<ProcedureDecoratorInfo> {
        decorators
            .iter()
            .filter_map(|decorator| {
                let info = Self::extract_procedure_decorator(decorator, parsed_file)?;
                debug!(
                    procedure_type = ?info.procedure_type,
                    has_input = info.input.is_some(),
                    has_output = info.output.is_some(),
                    "Extracted procedure decorator"
                );
                Some(info)
            })
            .collect()
    }

    fn extract_procedure_decorator(
        decorator: &Decorator,
        parsed_file: &ParsedFile,
    ) -> Option<ProcedureDecoratorInfo> {
        match &*decorator.expr {
            Expr::Call(call_expr) => Self::extract_from_call_expr(call_expr, parsed_file),
            Expr::Ident(ident) => Self::extract_ident_procedure(ident.sym.as_ref()),
            _ => None,
        }
    }

    fn extract_ident_procedure(name: &str) -> Option<ProcedureDecoratorInfo> {
        let procedure_type = match name {
            "Query" => ProcedureType::Query,
            "Mutation" => ProcedureType::Mutation,
            _ => return None,
        };

        trace!("Found @{} decorator without arguments", name);
        Some(ProcedureDecoratorInfo {
            procedure_type,
            input: None,
            output: None,
            input_ref: None,
            output_ref: None,
        })
    }

    fn extract_from_call_expr(
        call_expression: &CallExpr,
        parsed_file: &ParsedFile,
    ) -> Option<ProcedureDecoratorInfo> {
        let procedure_type = Self::get_procedure_type_from_callee(&call_expression.callee)?;

        trace!(procedure_type = ?procedure_type, "Found procedure decorator call expression");

        if call_expression.args.is_empty() {
            return Some(ProcedureDecoratorInfo {
                procedure_type,
                input: None,
                output: None,
                input_ref: None,
                output_ref: None,
            });
        }

        let first_argument = &call_expression.args[0];
        let arguments = Self::extract_arguments_from_argument(first_argument, parsed_file);

        Some(ProcedureDecoratorInfo {
            procedure_type,
            input: arguments.input,
            output: arguments.output,
            input_ref: arguments.input_ref,
            output_ref: arguments.output_ref,
        })
    }

    fn get_procedure_type_from_callee(callee: &Callee) -> Option<ProcedureType> {
        let Callee::Expr(expression) = callee else {
            return None;
        };

        let Expr::Ident(identifier) = &**expression else {
            return None;
        };

        match identifier.sym.as_ref() {
            "Query" => Some(ProcedureType::Query),
            "Mutation" => Some(ProcedureType::Mutation),
            _ => None,
        }
    }

    fn extract_arguments_from_argument(
        argument: &ExprOrSpread,
        parsed_file: &ParsedFile,
    ) -> DecoratorArguments {
        let Expr::Object(object_literal) = &*argument.expr else {
            warn!("Procedure decorator argument is not an object literal");
            return DecoratorArguments::default();
        };

        Self::extract_arguments_from_object(object_literal, parsed_file)
    }

    fn extract_arguments_from_object(
        object: &ObjectLit,
        parsed_file: &ParsedFile,
    ) -> DecoratorArguments {
        let mut arguments = DecoratorArguments::default();

        for property_or_spread in &object.props {
            Self::extract_property_into_arguments(property_or_spread, parsed_file, &mut arguments);
        }

        arguments
    }

    fn extract_property_into_arguments(
        property_or_spread: &PropOrSpread,
        parsed_file: &ParsedFile,
        arguments: &mut DecoratorArguments,
    ) {
        let PropOrSpread::Prop(property) = property_or_spread else {
            return;
        };

        let Prop::KeyValue(key_value) = &**property else {
            return;
        };

        let Some(property_name) = Self::get_property_name(&key_value.key) else {
            return;
        };

        match property_name.as_str() {
            "input" => {
                arguments.input = Some(Self::extract_value_text(&key_value.value, parsed_file));
                arguments.input_ref = Self::extract_identifier_name(&key_value.value);
                trace!(input = ?arguments.input, input_ref = ?arguments.input_ref, "Extracted input property");
            }
            "output" => {
                arguments.output = Some(Self::extract_value_text(&key_value.value, parsed_file));
                arguments.output_ref = Self::extract_identifier_name(&key_value.value);
                trace!(output = ?arguments.output, output_ref = ?arguments.output_ref, "Extracted output property");
            }
            _ => {}
        }
    }

    fn get_property_name(key: &PropName) -> Option<String> {
        match key {
            PropName::Ident(ident) => Some(ident.sym.to_string()),
            PropName::Str(s) => Some(s.value.to_string_lossy().into_owned()),
            _ => None,
        }
    }

    fn extract_value_text(expr: &Expr, parsed_file: &ParsedFile) -> String {
        let span = match expr {
            Expr::Call(call) => call.span,
            Expr::Ident(ident) => ident.span,
            Expr::Object(obj) => obj.span,
            Expr::Member(member) => member.span,
            Expr::Array(arr) => arr.span,
            _ => Self::get_expr_span(expr),
        };

        parsed_file.get_source_text(span)
    }

    fn extract_identifier_name(expr: &Expr) -> Option<String> {
        match expr {
            Expr::Ident(ident) => Some(ident.sym.to_string()),
            _ => None,
        }
    }

    fn get_expr_span(expr: &Expr) -> swc_common::Span {
        use swc_ecma_ast::{Expr, Lit};
        match expr {
            Expr::This(e) => e.span,
            Expr::Array(e) => e.span,
            Expr::Object(e) => e.span,
            Expr::Fn(e) => e.function.span,
            Expr::Unary(e) => e.span,
            Expr::Update(e) => e.span,
            Expr::Bin(e) => e.span,
            Expr::Assign(e) => e.span,
            Expr::Member(e) => e.span,
            Expr::SuperProp(e) => e.span,
            Expr::Cond(e) => e.span,
            Expr::Call(e) => e.span,
            Expr::New(e) => e.span,
            Expr::Seq(e) => e.span,
            Expr::Ident(e) => e.span,
            Expr::Lit(e) => match e {
                Lit::Str(s) => s.span,
                Lit::Bool(b) => b.span,
                Lit::Null(n) => n.span,
                Lit::Num(n) => n.span,
                Lit::BigInt(b) => b.span,
                Lit::Regex(r) => r.span,
                Lit::JSXText(j) => j.span,
            },
            Expr::Tpl(e) => e.span,
            Expr::TaggedTpl(e) => e.span,
            Expr::Arrow(e) => e.span,
            Expr::Class(e) => e.class.span,
            Expr::Yield(e) => e.span,
            Expr::MetaProp(e) => e.span,
            Expr::Await(e) => e.span,
            Expr::Paren(e) => e.span,
            Expr::JSXMember(e) => e.prop.span,
            Expr::JSXNamespacedName(e) => e.name.span,
            Expr::JSXEmpty(e) => e.span,
            Expr::JSXElement(e) => e.span,
            Expr::JSXFragment(e) => e.span,
            Expr::TsTypeAssertion(e) => e.span,
            Expr::TsConstAssertion(e) => e.span,
            Expr::TsNonNull(e) => e.span,
            Expr::TsAs(e) => e.span,
            Expr::TsInstantiation(e) => e.span,
            Expr::TsSatisfies(e) => e.span,
            Expr::PrivateName(e) => e.span,
            Expr::OptChain(e) => e.span,
            Expr::Invalid(e) => e.span,
        }
    }
}

#[must_use]
pub fn is_procedure_decorator(decorator: &Decorator) -> bool {
    match &*decorator.expr {
        Expr::Call(call_expr) => is_procedure_call(call_expr),
        Expr::Ident(ident) => is_procedure_name(ident.sym.as_ref()),
        _ => false,
    }
}

fn is_procedure_call(call_expression: &CallExpr) -> bool {
    let Callee::Expr(expression) = &call_expression.callee else {
        return false;
    };
    let Expr::Ident(ident) = &**expression else {
        return false;
    };
    is_procedure_name(ident.sym.as_ref())
}

fn is_procedure_name(name: &str) -> bool {
    name == "Query" || name == "Mutation"
}

#[cfg(test)]
fn extract_class_from_module_item(item: &swc_ecma_ast::ModuleItem) -> Option<&swc_ecma_ast::Class> {
    use swc_ecma_ast::{Decl, ModuleDecl, ModuleItem, Stmt};
    if let ModuleItem::ModuleDecl(ModuleDecl::ExportDecl(export)) = item {
        if let Decl::Class(class_decl) = &export.decl {
            return Some(&class_decl.class);
        }
    }
    if let ModuleItem::Stmt(Stmt::Decl(Decl::Class(class_decl))) = item {
        return Some(&class_decl.class);
    }
    None
}

#[cfg(test)]
fn extract_method_if_named<'a>(
    member: &'a swc_ecma_ast::ClassMember,
    name: &str,
) -> Option<&'a Vec<swc_ecma_ast::Decorator>> {
    use swc_ecma_ast::ClassMember;
    let ClassMember::Method(method) = member else {
        return None;
    };
    let ident = method.key.as_ident()?;
    if ident.sym.as_ref() == name {
        return Some(&method.function.decorators);
    }
    None
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::parser::TsParser;
    use std::fs;
    use std::path::PathBuf;
    use tempfile::TempDir;

    fn create_temp_file(content: &str) -> (TempDir, PathBuf) {
        let temp_dir = TempDir::new().expect("Failed to create temp dir");
        let file_path = temp_dir.path().join("test.router.ts");
        fs::write(&file_path, content).expect("Failed to write test file");
        (temp_dir, file_path)
    }

    fn parse_file(source: &str) -> (TempDir, ParsedFile) {
        let (temp_dir, path) = create_temp_file(source);
        let parser = TsParser::new();
        let parsed = parser.parse_file(&path).expect("Failed to parse");
        (temp_dir, parsed)
    }

    fn get_method_decorators<'a>(
        parsed: &'a ParsedFile,
        method_name: &str,
    ) -> Option<&'a Vec<Decorator>> {
        parsed
            .module
            .body
            .iter()
            .filter_map(extract_class_from_module_item)
            .flat_map(|class| &class.body)
            .find_map(|member| extract_method_if_named(member, method_name))
    }

    #[test]
    fn test_decorator_parser_creation() {
        let parser = DecoratorParser::new();
        assert_eq!(std::mem::size_of_val(&parser), 0);
    }

    #[test]
    fn test_decorator_parser_default() {
        let parser = DecoratorParser;
        assert_eq!(std::mem::size_of_val(&parser), 0);
    }

    #[test]
    fn test_extract_query_decorator_with_input() {
        let source = r"
            function Query(opts?: { input?: any }): MethodDecorator {
                return (target, key, desc) => desc;
            }

            export class UserRouter {
                @Query({ input: z.object({ userId: z.string() }) })
                async getUserById() {}
            }
        ";

        let (_temp, parsed) = parse_file(source);
        let decorators = get_method_decorators(&parsed, "getUserById").expect("Method not found");
        let decorator_parser = DecoratorParser::new();
        let results = decorator_parser.extract_procedure_decorators(decorators, &parsed);

        assert_eq!(results.len(), 1);
        assert_eq!(results[0].procedure_type, ProcedureType::Query);
        assert!(results[0].input.is_some());
        assert!(results[0].input.as_ref().unwrap().contains("z.object"));
        assert!(results[0].input.as_ref().unwrap().contains("userId"));
        assert!(results[0].output.is_none());
    }

    #[test]
    fn test_extract_query_decorator_with_input_and_output() {
        let source = r"
            function Query(opts?: { input?: any; output?: any }): MethodDecorator {
                return (target, key, desc) => desc;
            }

            export class UserRouter {
                @Query({
                    input: z.object({ userId: z.string() }),
                    output: z.object({ name: z.string() })
                })
                async getUserById() {}
            }
        ";

        let (_temp, parsed) = parse_file(source);
        let decorators = get_method_decorators(&parsed, "getUserById").expect("Method not found");
        let decorator_parser = DecoratorParser::new();
        let results = decorator_parser.extract_procedure_decorators(decorators, &parsed);

        assert_eq!(results.len(), 1);
        assert_eq!(results[0].procedure_type, ProcedureType::Query);
        assert!(results[0].input.is_some());
        assert!(results[0].output.is_some());
        assert!(results[0].output.as_ref().unwrap().contains("name"));
    }

    #[test]
    fn test_extract_mutation_decorator() {
        let source = r"
            function Mutation(opts?: { input?: any }): MethodDecorator {
                return (target, key, desc) => desc;
            }

            export class UserRouter {
                @Mutation({ input: z.object({ name: z.string() }) })
                async createUser() {}
            }
        ";

        let (_temp, parsed) = parse_file(source);
        let decorators = get_method_decorators(&parsed, "createUser").expect("Method not found");
        let decorator_parser = DecoratorParser::new();
        let results = decorator_parser.extract_procedure_decorators(decorators, &parsed);

        assert_eq!(results.len(), 1);
        assert_eq!(results[0].procedure_type, ProcedureType::Mutation);
        assert!(results[0].input.is_some());
    }

    #[test]
    fn test_extract_query_without_arguments() {
        let source = r"
            function Query(opts?: any): MethodDecorator {
                return (target, key, desc) => desc;
            }

            export class UserRouter {
                @Query()
                async getAll() {}
            }
        ";

        let (_temp, parsed) = parse_file(source);
        let decorators = get_method_decorators(&parsed, "getAll").expect("Method not found");
        let decorator_parser = DecoratorParser::new();
        let results = decorator_parser.extract_procedure_decorators(decorators, &parsed);

        assert_eq!(results.len(), 1);
        assert_eq!(results[0].procedure_type, ProcedureType::Query);
        assert!(results[0].input.is_none());
        assert!(results[0].output.is_none());
    }

    #[test]
    fn test_extract_query_no_parentheses() {
        let source = r"
            function Query(target: any, key: string, desc: PropertyDescriptor): PropertyDescriptor {
                return desc;
            }

            export class UserRouter {
                @Query
                async getAll() {}
            }
        ";

        let (_temp, parsed) = parse_file(source);
        let decorators = get_method_decorators(&parsed, "getAll").expect("Method not found");
        let decorator_parser = DecoratorParser::new();
        let results = decorator_parser.extract_procedure_decorators(decorators, &parsed);

        assert_eq!(results.len(), 1);
        assert_eq!(results[0].procedure_type, ProcedureType::Query);
        assert!(results[0].input.is_none());
    }

    #[test]
    fn test_ignore_non_procedure_decorators() {
        let source = r"
            function Query(opts?: any): MethodDecorator {
                return (target, key, desc) => desc;
            }

            function UseGuards(guard: any): MethodDecorator {
                return (target, key, desc) => desc;
            }

            export class UserRouter {
                @UseGuards('admin')
                @Query({ input: z.string() })
                async adminOnly() {}
            }
        ";

        let (_temp, parsed) = parse_file(source);
        let decorators = get_method_decorators(&parsed, "adminOnly").expect("Method not found");
        let decorator_parser = DecoratorParser::new();
        let results = decorator_parser.extract_procedure_decorators(decorators, &parsed);

        // Should only extract @Query, not @UseGuards
        assert_eq!(results.len(), 1);
        assert_eq!(results[0].procedure_type, ProcedureType::Query);
    }

    #[test]
    fn test_extract_with_variable_reference() {
        let source = r"
            function Query(opts?: any): MethodDecorator {
                return (target, key, desc) => desc;
            }

            export class UserRouter {
                @Query({ input: userInputSchema, output: userSchema })
                async getUser() {}
            }
        ";

        let (_temp, parsed) = parse_file(source);
        let decorators = get_method_decorators(&parsed, "getUser").expect("Method not found");
        let decorator_parser = DecoratorParser::new();
        let results = decorator_parser.extract_procedure_decorators(decorators, &parsed);

        assert_eq!(results.len(), 1);
        // Variable references should be extracted as the identifier name
        assert_eq!(results[0].input, Some("userInputSchema".to_string()));
        assert_eq!(results[0].output, Some("userSchema".to_string()));
    }

    #[test]
    fn test_extract_output_only() {
        let source = r"
            function Query(opts?: { output?: any }): MethodDecorator {
                return (target, key, desc) => desc;
            }

            export class UserRouter {
                @Query({ output: z.array(z.string()) })
                async getNames() {}
            }
        ";

        let (_temp, parsed) = parse_file(source);
        let decorators = get_method_decorators(&parsed, "getNames").expect("Method not found");
        let decorator_parser = DecoratorParser::new();
        let results = decorator_parser.extract_procedure_decorators(decorators, &parsed);

        assert_eq!(results.len(), 1);
        assert!(results[0].input.is_none());
        assert!(results[0].output.is_some());
        assert!(results[0].output.as_ref().unwrap().contains("z.array"));
    }

    #[test]
    fn test_extract_multiple_methods() {
        let source = r"
            function Query(opts?: any): MethodDecorator {
                return (target, key, desc) => desc;
            }

            function Mutation(opts?: any): MethodDecorator {
                return (target, key, desc) => desc;
            }

            export class UserRouter {
                @Query({ input: z.string() })
                async getUser() {}

                @Mutation({ input: z.object({ name: z.string() }) })
                async createUser() {}
            }
        ";

        let (_temp, parsed) = parse_file(source);
        let decorator_parser = DecoratorParser::new();

        // Check getUser method
        let decorators1 = get_method_decorators(&parsed, "getUser").expect("Method not found");
        let results1 = decorator_parser.extract_procedure_decorators(decorators1, &parsed);
        assert_eq!(results1.len(), 1);
        assert_eq!(results1[0].procedure_type, ProcedureType::Query);

        // Check createUser method
        let decorators2 = get_method_decorators(&parsed, "createUser").expect("Method not found");
        let results2 = decorator_parser.extract_procedure_decorators(decorators2, &parsed);
        assert_eq!(results2.len(), 1);
        assert_eq!(results2[0].procedure_type, ProcedureType::Mutation);
    }

    #[test]
    fn test_is_procedure_decorator() {
        let source = r"
            function Query(opts?: any): MethodDecorator {
                return (target, key, desc) => desc;
            }

            function Injectable(): ClassDecorator {
                return (target) => target;
            }

            export class UserRouter {
                @Query({ input: z.string() })
                async getUser() {}
            }
        ";

        let (_temp, parsed) = parse_file(source);
        let decorators = get_method_decorators(&parsed, "getUser").expect("Method not found");

        assert!(!decorators.is_empty());
        assert!(is_procedure_decorator(&decorators[0]));
    }

    #[test]
    fn test_complex_zod_schema() {
        let source = r"
            function Query(opts?: any): MethodDecorator {
                return (target, key, desc) => desc;
            }

            export class UserRouter {
                @Query({
                    input: z.object({
                        userId: z.string().uuid(),
                        options: z.object({
                            includeProfile: z.boolean().optional(),
                            limit: z.number().min(1).max(100)
                        }).optional()
                    }),
                    output: z.object({
                        id: z.string(),
                        name: z.string(),
                        email: z.string().email()
                    })
                })
                async getUser() {}
            }
        ";

        let (_temp, parsed) = parse_file(source);
        let decorators = get_method_decorators(&parsed, "getUser").expect("Method not found");
        let decorator_parser = DecoratorParser::new();
        let results = decorator_parser.extract_procedure_decorators(decorators, &parsed);

        assert_eq!(results.len(), 1);
        let input = results[0].input.as_ref().unwrap();
        assert!(input.contains("userId"));
        assert!(input.contains("uuid"));
        assert!(input.contains("includeProfile"));
        assert!(input.contains("boolean"));

        let output = results[0].output.as_ref().unwrap();
        assert!(output.contains("email"));
    }

    #[test]
    fn test_procedure_decorator_info_equality() {
        let info1 = ProcedureDecoratorInfo {
            procedure_type: ProcedureType::Query,
            input: Some("z.string()".to_string()),
            output: None,
            input_ref: None,
            output_ref: None,
        };
        let info2 = ProcedureDecoratorInfo {
            procedure_type: ProcedureType::Query,
            input: Some("z.string()".to_string()),
            output: None,
            input_ref: None,
            output_ref: None,
        };
        assert_eq!(info1, info2);
    }

    #[test]
    fn test_procedure_decorator_info_clone() {
        let info = ProcedureDecoratorInfo {
            procedure_type: ProcedureType::Mutation,
            input: Some("z.object({})".to_string()),
            output: Some("z.void()".to_string()),
            input_ref: None,
            output_ref: None,
        };
        let cloned = info.clone();
        assert_eq!(info, cloned);
    }

    #[test]
    fn test_procedure_decorator_info_debug() {
        let info = ProcedureDecoratorInfo {
            procedure_type: ProcedureType::Query,
            input: Some("test".to_string()),
            output: None,
            input_ref: None,
            output_ref: None,
        };
        let debug_str = format!("{info:?}");
        assert!(debug_str.contains("Query"));
        assert!(debug_str.contains("test"));
    }
}
