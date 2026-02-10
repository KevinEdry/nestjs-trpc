use super::ZodFlattener;
use super::ZodResult;
use crate::error::GeneratorError;
use crate::parser::imports::{ImportResolver, ResolvedImport};
use crate::parser::schema::helpers::ZodHelpers;
use crate::parser::ParsedFile;
use std::collections::HashMap;
use std::path::Path;
use swc_ecma_ast::{Decl, Expr, ModuleDecl, ModuleItem, Pat, Stmt};
use tracing::{trace, warn};

impl ZodFlattener<'_> {
    pub(super) fn flatten_identifier(
        &mut self,
        identifier: &swc_ecma_ast::Ident,
        source_file: &ParsedFile,
        imports_map: &HashMap<String, ResolvedImport>,
        schema: String,
        depth: usize,
    ) -> ZodResult<String> {
        let name = identifier.sym.to_string();
        trace!(identifier = %name, "Processing identifier");

        if self.resolving.contains(&name) {
            warn!(identifier = %name, "Circular schema reference detected");
            return Ok(schema);
        }

        if name == "z" {
            return Ok(schema);
        }

        if self.importable_identifiers.contains(&name) {
            return Ok(schema);
        }

        self.try_resolve_identifier(&name, source_file, imports_map, schema, depth)
    }

    fn try_resolve_identifier(
        &mut self,
        name: &str,
        source_file: &ParsedFile,
        imports_map: &HashMap<String, ResolvedImport>,
        schema: String,
        depth: usize,
    ) -> ZodResult<String> {
        if let Some(resolved_schema) =
            self.resolve_local_identifier(name, source_file, imports_map, depth)?
        {
            return Ok(schema.replace(name, &resolved_schema));
        }

        self.try_resolve_from_imports(name, imports_map, schema, depth)
    }

    fn try_resolve_from_imports(
        &mut self,
        name: &str,
        imports_map: &HashMap<String, ResolvedImport>,
        schema: String,
        depth: usize,
    ) -> ZodResult<String> {
        let Some(import) = imports_map.get(name) else {
            return Ok(schema);
        };

        let Some(resolved_schema) = self.resolve_imported_identifier(name, import, depth)? else {
            return Ok(schema);
        };

        Ok(schema.replace(name, &resolved_schema))
    }

    fn resolve_local_identifier(
        &mut self,
        name: &str,
        source_file: &ParsedFile,
        imports_map: &HashMap<String, ResolvedImport>,
        depth: usize,
    ) -> ZodResult<Option<String>> {
        self.resolving.push(name.to_string());

        let result = self.search_local_identifier(name, source_file, imports_map, depth);

        self.resolving.pop();
        result
    }

    fn search_local_identifier(
        &mut self,
        name: &str,
        source_file: &ParsedFile,
        imports_map: &HashMap<String, ResolvedImport>,
        depth: usize,
    ) -> ZodResult<Option<String>> {
        let initializer = source_file
            .module
            .body
            .iter()
            .find_map(|item| Self::find_variable_declaration_initializer(item, name));

        let Some(initializer_expression) = initializer else {
            return Ok(None);
        };

        let initializer_text = self.get_source_text(
            source_file,
            self.get_expression_span(&initializer_expression),
        );

        let flattened = self.flatten_expression(
            &initializer_expression,
            source_file,
            imports_map,
            initializer_text,
            depth + 1,
        )?;

        Ok(Some(flattened))
    }

    fn resolve_imported_identifier(
        &mut self,
        name: &str,
        import: &ResolvedImport,
        depth: usize,
    ) -> ZodResult<Option<String>> {
        self.resolving.push(name.to_string());

        let result = self.search_imported_identifier(name, import, depth);

        self.resolving.pop();
        result
    }

    fn search_imported_identifier(
        &mut self,
        name: &str,
        import: &ResolvedImport,
        depth: usize,
    ) -> ZodResult<Option<String>> {
        let imported_file = self.get_or_parse_file(&import.source_file)?;

        let mut resolver = ImportResolver::new(self.parser);
        let imported_imports_map = resolver
            .build_imports_map(&imported_file, &self.base_directory)
            .unwrap_or_default();

        let initializer = imported_file
            .module
            .body
            .iter()
            .find_map(|item| Self::find_variable_declaration_initializer(item, name));

        let Some(initializer_expression) = initializer else {
            return Ok(None);
        };

        let initializer_text = self.get_source_text(
            &imported_file,
            self.get_expression_span(&initializer_expression),
        );

        let flattened = self.flatten_expression(
            &initializer_expression,
            &imported_file,
            &imported_imports_map,
            initializer_text,
            depth + 1,
        )?;

        Ok(Some(flattened))
    }

    fn find_variable_declaration_initializer(item: &ModuleItem, name: &str) -> Option<Expr> {
        let variable_declaration = extract_variable_declaration(item)?;

        variable_declaration
            .decls
            .iter()
            .find_map(|declarator| extract_matching_initializer(declarator, name))
    }
}

fn extract_variable_declaration(item: &ModuleItem) -> Option<&swc_ecma_ast::VarDecl> {
    match item {
        ModuleItem::Stmt(Stmt::Decl(Decl::Var(variable))) => Some(variable),
        ModuleItem::ModuleDecl(ModuleDecl::ExportDecl(export)) => {
            let Decl::Var(variable) = &export.decl else {
                return None;
            };
            Some(variable)
        }
        _ => None,
    }
}

fn extract_matching_initializer(
    declarator: &swc_ecma_ast::VarDeclarator,
    name: &str,
) -> Option<Expr> {
    let Pat::Ident(identifier) = &declarator.name else {
        return None;
    };

    if identifier.id.sym.as_ref() != name {
        return None;
    }

    declarator
        .init
        .as_ref()
        .map(|expression| (*expression.clone()).clone())
}

impl ZodFlattener<'_> {
    fn get_or_parse_file(&mut self, path: &Path) -> ZodResult<ParsedFile> {
        if let Some(cached) = self.parsed_cache.get(path) {
            return Ok(cached.clone());
        }

        let parsed =
            self.parser
                .parse_file(path)
                .map_err(|error| GeneratorError::SchemaFlattenFailed {
                    path: path.to_path_buf(),
                    schema: String::new(),
                    message: format!("Failed to parse file: {error}"),
                })?;

        self.parsed_cache.insert(path.to_path_buf(), parsed.clone());
        Ok(parsed)
    }
}
