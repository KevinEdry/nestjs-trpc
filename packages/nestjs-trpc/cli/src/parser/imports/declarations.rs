use super::types::{DeclarationType, ResolvedImport};
use crate::parser::ParsedFile;
use swc_common::Span;
use swc_ecma_ast::{Decl, ExportDecl, ModuleDecl, ModuleItem, Stmt, VarDecl};

/// Finds a declaration by name in a parsed file.
/// Searches through all module items for matching declarations.
pub fn find_declaration_in_file(parsed: &ParsedFile, name: &str) -> Option<ResolvedImport> {
    parsed
        .module
        .body
        .iter()
        .find_map(|item| match_declaration_item(item, parsed, name))
}

fn match_declaration_item(
    item: &ModuleItem,
    parsed: &ParsedFile,
    name: &str,
) -> Option<ResolvedImport> {
    match item {
        ModuleItem::Stmt(Stmt::Decl(Decl::Var(variable_declaration)))
        | ModuleItem::ModuleDecl(ModuleDecl::ExportDecl(ExportDecl {
            decl: Decl::Var(variable_declaration),
            ..
        })) => find_variable_declaration(variable_declaration, parsed, name),

        ModuleItem::Stmt(Stmt::Decl(Decl::Class(class_declaration)))
        | ModuleItem::ModuleDecl(ModuleDecl::ExportDecl(ExportDecl {
            decl: Decl::Class(class_declaration),
            ..
        })) => match_class_declaration(class_declaration, parsed, name),

        ModuleItem::Stmt(Stmt::Decl(Decl::Fn(function_declaration)))
        | ModuleItem::ModuleDecl(ModuleDecl::ExportDecl(ExportDecl {
            decl: Decl::Fn(function_declaration),
            ..
        })) => match_function_declaration(function_declaration, parsed, name),

        ModuleItem::Stmt(Stmt::Decl(Decl::TsInterface(interface_declaration)))
        | ModuleItem::ModuleDecl(ModuleDecl::ExportDecl(ExportDecl {
            decl: Decl::TsInterface(interface_declaration),
            ..
        })) => match_interface_declaration(interface_declaration, parsed, name),

        ModuleItem::Stmt(Stmt::Decl(Decl::TsEnum(enum_declaration)))
        | ModuleItem::ModuleDecl(ModuleDecl::ExportDecl(ExportDecl {
            decl: Decl::TsEnum(enum_declaration),
            ..
        })) => match_enum_declaration(enum_declaration, parsed, name),

        ModuleItem::Stmt(Stmt::Decl(Decl::TsTypeAlias(type_declaration)))
        | ModuleItem::ModuleDecl(ModuleDecl::ExportDecl(ExportDecl {
            decl: Decl::TsTypeAlias(type_declaration),
            ..
        })) => match_type_alias_declaration(type_declaration, parsed, name),

        _ => None,
    }
}

fn find_variable_declaration(
    variable_declaration: &VarDecl,
    parsed: &ParsedFile,
    name: &str,
) -> Option<ResolvedImport> {
    let span = find_variable_declaration_span(variable_declaration, name)?;
    Some(ResolvedImport {
        name: name.to_string(),
        source_file: parsed.file_path.clone(),
        declaration_span: span,
        declaration_type: DeclarationType::Variable,
    })
}

/// Finds a variable declaration by name and returns its span.
pub fn find_variable_declaration_span(variable_declaration: &VarDecl, name: &str) -> Option<Span> {
    let has_name = variable_declaration.decls.iter().any(|declarator| {
        matches!(&declarator.name, swc_ecma_ast::Pat::Ident(identifier) if identifier.id.sym.as_ref() == name)
    });

    has_name.then_some(variable_declaration.span)
}

fn match_class_declaration(
    class_declaration: &swc_ecma_ast::ClassDecl,
    parsed: &ParsedFile,
    name: &str,
) -> Option<ResolvedImport> {
    if class_declaration.ident.sym.as_ref() != name {
        return None;
    }

    Some(ResolvedImport {
        name: name.to_string(),
        source_file: parsed.file_path.clone(),
        declaration_span: class_declaration.class.span,
        declaration_type: DeclarationType::Class,
    })
}

fn match_function_declaration(
    function_declaration: &swc_ecma_ast::FnDecl,
    parsed: &ParsedFile,
    name: &str,
) -> Option<ResolvedImport> {
    if function_declaration.ident.sym.as_ref() != name {
        return None;
    }

    Some(ResolvedImport {
        name: name.to_string(),
        source_file: parsed.file_path.clone(),
        declaration_span: function_declaration.function.span,
        declaration_type: DeclarationType::Function,
    })
}

fn match_interface_declaration(
    interface_declaration: &swc_ecma_ast::TsInterfaceDecl,
    parsed: &ParsedFile,
    name: &str,
) -> Option<ResolvedImport> {
    if interface_declaration.id.sym.as_ref() != name {
        return None;
    }

    Some(ResolvedImport {
        name: name.to_string(),
        source_file: parsed.file_path.clone(),
        declaration_span: interface_declaration.span,
        declaration_type: DeclarationType::Interface,
    })
}

fn match_enum_declaration(
    enum_declaration: &swc_ecma_ast::TsEnumDecl,
    parsed: &ParsedFile,
    name: &str,
) -> Option<ResolvedImport> {
    if enum_declaration.id.sym.as_ref() != name {
        return None;
    }

    Some(ResolvedImport {
        name: name.to_string(),
        source_file: parsed.file_path.clone(),
        declaration_span: enum_declaration.span,
        declaration_type: DeclarationType::Enum,
    })
}

fn match_type_alias_declaration(
    type_declaration: &swc_ecma_ast::TsTypeAliasDecl,
    parsed: &ParsedFile,
    name: &str,
) -> Option<ResolvedImport> {
    if type_declaration.id.sym.as_ref() != name {
        return None;
    }

    Some(ResolvedImport {
        name: name.to_string(),
        source_file: parsed.file_path.clone(),
        declaration_span: type_declaration.span,
        declaration_type: DeclarationType::TypeAlias,
    })
}
