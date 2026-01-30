use crate::parser::ParsedFile;
use swc_common::Span;
use swc_ecma_ast::{Expr, Lit, MemberProp, PropName};

#[allow(dead_code)] // Trait methods for Zod schema processing, some may be used in future
pub(super) trait ZodHelpers {
    fn get_source_text(&self, file: &ParsedFile, span: Span) -> String;
    fn get_member_property_name(&self, property: &MemberProp) -> String;
    fn get_property_key_text(&self, key: &PropName, file: &ParsedFile) -> String;
    fn expression_type_name(&self, expression: &Expr) -> &'static str;
    fn get_key_value_span(&self, key_value: &swc_ecma_ast::KeyValueProp) -> Span;
    fn get_expression_span(&self, expression: &Expr) -> Span;
}

impl<T> ZodHelpers for T {
    fn get_source_text(&self, file: &ParsedFile, span: Span) -> String {
        file.get_source_text(span)
    }

    fn get_member_property_name(&self, property: &MemberProp) -> String {
        match property {
            MemberProp::Ident(identifier) => identifier.sym.to_string(),
            MemberProp::PrivateName(private) => format!("#{}", private.name),
            MemberProp::Computed(computed) => extract_computed_property_name(&computed.expr),
        }
    }

    fn get_property_key_text(&self, key: &PropName, file: &ParsedFile) -> String {
        match key {
            PropName::Ident(identifier) => identifier.sym.to_string(),
            PropName::Str(string) => format!("\"{}\"", string.value.to_string_lossy()),
            PropName::Num(number) => number.value.to_string(),
            PropName::BigInt(bigint) => bigint.value.to_string(),
            PropName::Computed(computed) => self.get_source_text(file, computed.span),
        }
    }

    fn expression_type_name(&self, expression: &Expr) -> &'static str {
        match expression {
            Expr::Ident(_) => "Identifier",
            Expr::Object(_) => "ObjectLiteral",
            Expr::Array(_) => "ArrayLiteral",
            Expr::Call(_) => "CallExpression",
            Expr::Member(_) => "MemberExpression",
            Expr::Paren(_) => "Parenthesized",
            Expr::Lit(_) => "Literal",
            _ => "Other",
        }
    }

    fn get_key_value_span(&self, key_value: &swc_ecma_ast::KeyValueProp) -> Span {
        let start = match &key_value.key {
            PropName::Ident(identifier) => identifier.span.lo,
            PropName::Str(string) => string.span.lo,
            PropName::Num(number) => number.span.lo,
            PropName::BigInt(bigint) => bigint.span.lo,
            PropName::Computed(computed) => computed.span.lo,
        };
        let end = self.get_expression_span(&key_value.value).hi;
        Span::new(start, end)
    }

    fn get_expression_span(&self, expression: &Expr) -> Span {
        match expression {
            Expr::This(element) => element.span,
            Expr::Array(element) => element.span,
            Expr::Object(element) => element.span,
            Expr::Fn(element) => element.function.span,
            Expr::Unary(element) => element.span,
            Expr::Update(element) => element.span,
            Expr::Bin(element) => element.span,
            Expr::Assign(element) => element.span,
            Expr::Member(element) => element.span,
            Expr::SuperProp(element) => element.span,
            Expr::Cond(element) => element.span,
            Expr::Call(element) => element.span,
            Expr::New(element) => element.span,
            Expr::Seq(element) => element.span,
            Expr::Ident(element) => element.span,
            Expr::Lit(literal) => match literal {
                Lit::Str(string) => string.span,
                Lit::Bool(boolean) => boolean.span,
                Lit::Null(null) => null.span,
                Lit::Num(number) => number.span,
                Lit::BigInt(bigint) => bigint.span,
                Lit::Regex(regex) => regex.span,
                Lit::JSXText(jsx_text) => jsx_text.span,
            },
            Expr::Tpl(element) => element.span,
            Expr::TaggedTpl(element) => element.span,
            Expr::Arrow(element) => element.span,
            Expr::Class(element) => element.class.span,
            Expr::Yield(element) => element.span,
            Expr::MetaProp(element) => element.span,
            Expr::Await(element) => element.span,
            Expr::Paren(element) => element.span,
            Expr::JSXMember(element) => element.prop.span,
            Expr::JSXNamespacedName(element) => element.name.span,
            Expr::JSXEmpty(element) => element.span,
            Expr::JSXElement(element) => element.span,
            Expr::JSXFragment(element) => element.span,
            Expr::TsTypeAssertion(element) => element.span,
            Expr::TsConstAssertion(element) => element.span,
            Expr::TsNonNull(element) => element.span,
            Expr::TsAs(element) => element.span,
            Expr::TsInstantiation(element) => element.span,
            Expr::TsSatisfies(element) => element.span,
            Expr::PrivateName(element) => element.span,
            Expr::OptChain(element) => element.span,
            Expr::Invalid(element) => element.span,
        }
    }
}

#[allow(dead_code)] // Called from trait impl
fn extract_computed_property_name(expression: &Expr) -> String {
    let Expr::Lit(Lit::Str(string)) = expression else {
        return "[computed]".to_string();
    };
    string.value.to_string_lossy().into_owned()
}
