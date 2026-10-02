use super::ParsedFile;
use swc_ecma_ast::{
    Decl, ExportSpecifier, Expr, ModuleDecl, ModuleExportName, ModuleItem, NamedExport, Pat, Stmt,
    VarDeclarator,
};

/// A parser function can only reach the generated router through an import: inlining its
/// definition would detach it from the scope its body closes over.
#[must_use]
pub fn declares_unexported_function(parsed_file: &ParsedFile, name: &str) -> bool {
    let is_exported_by_specifier =
        specifier_exported_names(parsed_file).any(|exported| exported == name);
    if is_exported_by_specifier {
        return false;
    }

    parsed_file
        .module
        .body
        .iter()
        .filter_map(unexported_declaration)
        .any(|declaration| declares_function(declaration, name))
}

/// Names exported through `export { name }`. A renamed export is left out because the
/// generated router imports a declaration under the name the decorator uses.
pub fn specifier_exported_names(parsed_file: &ParsedFile) -> impl Iterator<Item = &str> {
    parsed_file
        .module
        .body
        .iter()
        .filter_map(local_named_export)
        .flat_map(|named_export| &named_export.specifiers)
        .filter_map(unrenamed_specifier_name)
}

const fn local_named_export(item: &ModuleItem) -> Option<&NamedExport> {
    let ModuleItem::ModuleDecl(ModuleDecl::ExportNamed(named_export)) = item else {
        return None;
    };
    let is_reexport = named_export.src.is_some();
    if is_reexport || named_export.type_only {
        return None;
    }
    Some(named_export)
}

fn unrenamed_specifier_name(specifier: &ExportSpecifier) -> Option<&str> {
    let ExportSpecifier::Named(named) = specifier else {
        return None;
    };
    let ModuleExportName::Ident(original) = &named.orig else {
        return None;
    };
    let is_renamed = match &named.exported {
        None => false,
        Some(ModuleExportName::Ident(exported)) => exported.sym != original.sym,
        Some(ModuleExportName::Str(_)) => true,
    };
    if named.is_type_only || is_renamed {
        return None;
    }
    Some(original.sym.as_ref())
}

const fn unexported_declaration(item: &ModuleItem) -> Option<&Decl> {
    let ModuleItem::Stmt(Stmt::Decl(declaration)) = item else {
        return None;
    };
    Some(declaration)
}

fn declares_function(declaration: &Decl, name: &str) -> bool {
    match declaration {
        Decl::Fn(function) => function.ident.sym.as_ref() == name,
        Decl::Var(variables) => variables
            .decls
            .iter()
            .any(|declarator| is_function_declarator(declarator, name)),
        _ => false,
    }
}

fn is_function_declarator(declarator: &VarDeclarator, name: &str) -> bool {
    let Pat::Ident(identifier) = &declarator.name else {
        return false;
    };
    if identifier.id.sym.as_ref() != name {
        return false;
    }
    declarator
        .init
        .as_deref()
        .is_some_and(is_function_expression)
}

fn is_function_expression(expression: &Expr) -> bool {
    match expression {
        Expr::Arrow(_) | Expr::Fn(_) => true,
        Expr::Paren(parenthesized) => is_function_expression(&parenthesized.expr),
        _ => false,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::parser::TsParser;

    fn declares(source: &str, name: &str) -> bool {
        let parsed_file = TsParser::new()
            .parse_source("test.ts", source)
            .expect("Failed to parse source");
        declares_unexported_function(&parsed_file, name)
    }

    #[test]
    fn test_detects_function_declaration() {
        assert!(declares(
            "function parse(value: unknown) { return value; }",
            "parse"
        ));
    }

    #[test]
    fn test_detects_arrow_function() {
        assert!(declares(
            "const parse = (value: unknown) => value;",
            "parse"
        ));
    }

    #[test]
    fn test_detects_parenthesized_function_expression() {
        assert!(declares(
            "const parse = (function (value: unknown) { return value; });",
            "parse"
        ));
    }

    #[test]
    fn test_ignores_exported_functions() {
        assert!(!declares(
            "export function parse(value: unknown) { return value; }",
            "parse"
        ));
        assert!(!declares(
            "export const parse = (value: unknown) => value;",
            "parse"
        ));
    }

    #[test]
    fn test_ignores_functions_exported_by_specifier() {
        assert!(!declares(
            "function parse(value: unknown) { return value; }\nexport { parse };",
            "parse"
        ));
    }

    #[test]
    fn test_detects_functions_only_exported_under_another_name() {
        assert!(declares(
            "function parse(value: unknown) { return value; }\nexport { parse as validate };",
            "parse"
        ));
    }

    #[test]
    fn test_ignores_schema_variables() {
        assert!(!declares(
            "const parse = z.object({ id: z.string() });",
            "parse"
        ));
    }

    #[test]
    fn test_ignores_other_names() {
        assert!(!declares(
            "function parse(value: unknown) { return value; }",
            "validate"
        ));
    }
}
