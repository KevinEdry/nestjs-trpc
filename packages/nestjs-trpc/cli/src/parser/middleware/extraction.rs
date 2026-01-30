use crate::parser::ParsedFile;
use swc_common::Spanned;
use swc_ecma_ast::{
    BlockStmt, CallExpr, Callee, Expr, Lit, MemberExpr, MemberProp, ObjectLit, Prop, PropName,
    PropOrSpread, Stmt,
};
use tracing::trace;

use super::{ContextProperty, MiddlewareParser};

impl MiddlewareParser {
    pub(super) fn find_next_call<'a>(&self, body: &'a BlockStmt) -> Option<&'a CallExpr> {
        body.stmts
            .iter()
            .find_map(|statement| find_next_call_in_statement(statement, self))
    }
}

fn find_next_call_in_statement<'a>(
    statement: &'a Stmt,
    parser: &MiddlewareParser,
) -> Option<&'a CallExpr> {
    match statement {
        Stmt::Return(return_statement) => return_statement
            .arg
            .as_ref()
            .and_then(|arg| find_next_call_in_expression(arg, parser)),
        Stmt::Expr(expression_statement) => {
            find_next_call_in_expression(&expression_statement.expr, parser)
        }
        Stmt::Block(block) => parser.find_next_call(block),
        _ => None,
    }
}

fn find_next_call_in_expression<'a>(
    expression: &'a Expr,
    parser: &MiddlewareParser,
) -> Option<&'a CallExpr> {
    match expression {
        Expr::Call(call) => find_next_call_in_call_expr(call, parser),
        Expr::Await(await_expression) => {
            find_next_call_in_expression(&await_expression.arg, parser)
        }
        Expr::Paren(paren_expression) => {
            find_next_call_in_expression(&paren_expression.expr, parser)
        }
        _ => None,
    }
}

fn find_next_call_in_call_expr<'a>(
    call: &'a CallExpr,
    parser: &MiddlewareParser,
) -> Option<&'a CallExpr> {
    if parser.is_opts_next_call(call) {
        return Some(call);
    }

    call.args
        .iter()
        .find_map(|argument| find_next_call_in_expression(&argument.expr, parser))
}

fn extract_ctx_object(property: &PropOrSpread) -> Option<&ObjectLit> {
    let PropOrSpread::Prop(property_box) = property else {
        return None;
    };
    let Prop::KeyValue(key_value) = &**property_box else {
        return None;
    };

    let is_ctx = is_property_named(&key_value.key, "ctx");
    if !is_ctx {
        return None;
    }

    let Expr::Object(context_object) = &*key_value.value else {
        return None;
    };

    Some(context_object)
}

fn is_property_named(key: &PropName, expected_name: &str) -> bool {
    match key {
        PropName::Ident(identifier) => identifier.sym.as_ref() == expected_name,
        PropName::Str(string) => string.value.to_string_lossy() == expected_name,
        _ => false,
    }
}

impl MiddlewareParser {
    fn is_opts_next_call(&self, call: &CallExpr) -> bool {
        let Callee::Expr(callee) = &call.callee else {
            return false;
        };

        let Expr::Member(member) = &**callee else {
            return false;
        };

        self.is_opts_next_member(member)
    }

    #[allow(clippy::unused_self)]
    fn is_opts_next_member(&self, member: &MemberExpr) -> bool {
        let Expr::Ident(object) = &*member.obj else {
            return false;
        };

        if object.sym.as_ref() != "opts" {
            return false;
        }

        let MemberProp::Ident(property) = &member.prop else {
            return false;
        };

        property.sym.as_ref() == "next"
    }

    pub(super) fn extract_context_properties(
        &self,
        call: &CallExpr,
        parsed_file: &ParsedFile,
    ) -> Vec<ContextProperty> {
        let Some(first_argument) = call.args.first() else {
            return Vec::new();
        };

        let Expr::Object(options_object) = &*first_argument.expr else {
            return Vec::new();
        };

        let Some(context_object) = self.find_ctx_property(options_object) else {
            return Vec::new();
        };

        self.extract_properties_from_object(context_object, parsed_file)
    }

    #[allow(clippy::unused_self)]
    fn find_ctx_property<'a>(&self, object: &'a ObjectLit) -> Option<&'a ObjectLit> {
        let result = object
            .props
            .iter()
            .find_map(|property| extract_ctx_object(property));

        if result.is_some() {
            trace!("Found ctx property in opts.next() call");
        }

        result
    }

    fn extract_properties_from_object(
        &self,
        object: &ObjectLit,
        parsed_file: &ParsedFile,
    ) -> Vec<ContextProperty> {
        object
            .props
            .iter()
            .filter_map(|property| self.extract_single_property(property, parsed_file))
            .collect()
    }

    fn extract_single_property(
        &self,
        property: &PropOrSpread,
        parsed_file: &ParsedFile,
    ) -> Option<ContextProperty> {
        let PropOrSpread::Prop(property_box) = property else {
            return None;
        };

        match &**property_box {
            Prop::KeyValue(key_value) => {
                let name = self.get_property_key_name(&key_value.key)?;
                let type_string = self.infer_type_from_expression(&key_value.value, parsed_file);
                Some(ContextProperty { name, type_string })
            }
            Prop::Shorthand(identifier) => {
                let name = identifier.sym.to_string();
                Some(ContextProperty {
                    name,
                    type_string: "unknown".to_string(),
                })
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

    fn infer_type_from_expression(&self, expression: &Expr, parsed_file: &ParsedFile) -> String {
        match expression {
            Expr::Lit(literal) => self.type_from_literal(literal),
            Expr::Object(_) => parsed_file.get_source_text(expression.span()),
            Expr::Array(_) => "unknown[]".to_string(),
            Expr::Arrow(_) | Expr::Fn(_) => "Function".to_string(),
            Expr::Ident(identifier) => identifier.sym.to_string(),
            _ => "unknown".to_string(),
        }
    }

    #[allow(clippy::unused_self)]
    fn type_from_literal(&self, literal: &Lit) -> String {
        match literal {
            Lit::Str(_) | Lit::JSXText(_) => "string".to_string(),
            Lit::Num(_) => "number".to_string(),
            Lit::Bool(_) => "boolean".to_string(),
            Lit::Null(_) => "null".to_string(),
            Lit::BigInt(_) => "bigint".to_string(),
            Lit::Regex(_) => "RegExp".to_string(),
        }
    }
}

#[must_use]
pub fn extract_use_middlewares_names(decorator: &swc_ecma_ast::Decorator) -> Option<Vec<String>> {
    let Expr::Call(call_expression) = &*decorator.expr else {
        return None;
    };

    let Callee::Expr(callee) = &call_expression.callee else {
        return None;
    };

    let Expr::Ident(identifier) = &**callee else {
        return None;
    };

    if identifier.sym.as_ref() != "UseMiddlewares" {
        return None;
    }

    let mut names = Vec::new();

    for argument in &call_expression.args {
        if let Expr::Ident(identifier) = &*argument.expr {
            names.push(identifier.sym.to_string());
        }
    }

    Some(names)
}
