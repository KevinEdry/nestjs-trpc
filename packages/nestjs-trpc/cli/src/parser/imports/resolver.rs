use super::barrel::{find_export_in_barrel_item, BarrelExportMatch};
use super::circular::{extract_import_paths, CircularImportTracker};
use super::declarations::find_declaration_in_file;
use super::module_path::resolve_module_path;
use super::types::{ImportResult, ResolvedImport};
use crate::error::ImportError;
use crate::parser::{ParsedFile, TsParser};
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use swc_ecma_ast::{ModuleDecl, ModuleExportName, ModuleItem};
use tracing::{debug, trace, warn};

const DEFAULT_MAX_IMPORT_DEPTH: usize = 10;

#[derive(Debug)]
pub struct ImportResolver<'a> {
    parser: &'a TsParser,
    parsed_cache: HashMap<PathBuf, ParsedFile>,
    max_depth: usize,
}

impl<'a> ImportResolver<'a> {
    #[must_use]
    pub fn new(parser: &'a TsParser) -> Self {
        Self {
            parser,
            parsed_cache: HashMap::new(),
            max_depth: DEFAULT_MAX_IMPORT_DEPTH,
        }
    }

    #[must_use]
    pub const fn with_max_depth(mut self, max_depth: usize) -> Self {
        self.max_depth = max_depth;
        self
    }

    pub fn build_imports_map(
        &mut self,
        source_file: &ParsedFile,
        base_directory: &Path,
    ) -> ImportResult<HashMap<String, ResolvedImport>> {
        let mut imports_map = HashMap::new();
        let source_directory = source_file.file_path.parent().unwrap_or(base_directory);

        debug!(path = ?source_file.file_path, "Building imports map");

        for item in &source_file.module.body {
            self.process_module_item(item, source_directory, base_directory, &mut imports_map);
        }

        debug!(
            path = ?source_file.file_path,
            count = imports_map.len(),
            "Built imports map"
        );

        Ok(imports_map)
    }

    fn process_module_item(
        &mut self,
        item: &ModuleItem,
        source_directory: &Path,
        base_directory: &Path,
        imports_map: &mut HashMap<String, ResolvedImport>,
    ) {
        let ModuleItem::ModuleDecl(ModuleDecl::Import(import_declaration)) = item else {
            return;
        };

        let module_specifier = import_declaration.src.value.to_string_lossy().into_owned();
        if !is_relative_path(&module_specifier) {
            trace!(module = %module_specifier, "Skipping external import");
            return;
        }

        let Some(resolved_path) = resolve_module_path(source_directory, &module_specifier) else {
            trace!(module = %module_specifier, "Could not resolve module path");
            return;
        };

        self.process_import_specifiers(
            &import_declaration.specifiers,
            &resolved_path,
            base_directory,
            imports_map,
        );
    }

    fn process_import_specifiers(
        &mut self,
        specifiers: &[swc_ecma_ast::ImportSpecifier],
        resolved_path: &Path,
        base_directory: &Path,
        imports_map: &mut HashMap<String, ResolvedImport>,
    ) {
        for specifier in specifiers {
            self.process_single_specifier(specifier, resolved_path, base_directory, imports_map);
        }
    }

    fn process_single_specifier(
        &mut self,
        specifier: &swc_ecma_ast::ImportSpecifier,
        resolved_path: &Path,
        base_directory: &Path,
        imports_map: &mut HashMap<String, ResolvedImport>,
    ) {
        let swc_ecma_ast::ImportSpecifier::Named(named) = specifier else {
            return;
        };

        let local_name = named.local.sym.to_string();
        let imported_name = named
            .imported
            .as_ref()
            .map_or_else(|| local_name.clone(), get_module_export_name);

        trace!(
            name = %imported_name,
            local = %local_name,
            path = ?resolved_path,
            "Resolving named import"
        );

        match self.resolve_import(resolved_path, &imported_name, base_directory, 0) {
            Ok(resolved) => {
                imports_map.insert(local_name, resolved);
            }
            Err(error) => {
                warn!(
                    name = %imported_name,
                    error = %error,
                    "Failed to resolve import"
                );
            }
        }
    }

    fn resolve_import(
        &mut self,
        file_path: &Path,
        name: &str,
        base_directory: &Path,
        depth: usize,
    ) -> ImportResult<ResolvedImport> {
        if depth >= self.max_depth {
            return Err(ImportError::CircularImport {
                cycle: format!(
                    "Maximum resolution depth ({}) exceeded while resolving '{}'",
                    self.max_depth, name
                ),
            });
        }

        trace!(path = ?file_path, name = %name, depth, "Resolving import");

        let parsed = self.get_or_parse_file(file_path)?;

        if let Some(resolved) = find_declaration_in_file(&parsed, name) {
            return Ok(resolved);
        }

        let is_barrel_file = file_path
            .file_name()
            .is_some_and(|filename| filename == "index.ts" || filename == "index.tsx");

        let barrel_result = is_barrel_file
            .then(|| self.resolve_barrel_file_import(&parsed, name, base_directory, depth + 1))
            .transpose()?
            .flatten();

        barrel_result.map_or_else(
            || {
                Err(ImportError::Unresolved {
                    name: name.to_string(),
                    source_path: file_path.to_path_buf(),
                })
            },
            Ok,
        )
    }

    fn get_or_parse_file(&mut self, file_path: &Path) -> ImportResult<ParsedFile> {
        if let Some(cached) = self.parsed_cache.get(file_path) {
            return Ok(cached.clone());
        }

        let parsed =
            self.parser
                .parse_file(file_path)
                .map_err(|_error| ImportError::ModuleNotFound {
                    module: file_path.display().to_string(),
                    source_path: file_path.to_path_buf(),
                })?;

        self.parsed_cache
            .insert(file_path.to_path_buf(), parsed.clone());
        Ok(parsed)
    }

    fn resolve_barrel_file_import(
        &mut self,
        barrel_file: &ParsedFile,
        name: &str,
        base_directory: &Path,
        depth: usize,
    ) -> ImportResult<Option<ResolvedImport>> {
        let barrel_directory = barrel_file.file_path.parent().unwrap_or(base_directory);

        trace!(
            barrel = ?barrel_file.file_path,
            name = %name,
            "Resolving through barrel file"
        );

        self.search_barrel_items(
            &barrel_file.module.body,
            name,
            barrel_directory,
            base_directory,
            depth,
        )
    }

    #[allow(clippy::excessive_nesting)]
    fn search_barrel_items(
        &mut self,
        items: &[ModuleItem],
        name: &str,
        barrel_directory: &Path,
        base_directory: &Path,
        depth: usize,
    ) -> ImportResult<Option<ResolvedImport>> {
        for item in items {
            let result =
                self.try_resolve_barrel_item(item, name, barrel_directory, base_directory, depth)?;
            if result.is_some() {
                return Ok(result);
            }
        }
        Ok(None)
    }

    fn try_resolve_barrel_item(
        &mut self,
        item: &ModuleItem,
        name: &str,
        barrel_directory: &Path,
        base_directory: &Path,
        depth: usize,
    ) -> ImportResult<Option<ResolvedImport>> {
        match find_export_in_barrel_item(item, name, barrel_directory) {
            BarrelExportMatch::Named(export) => {
                let resolved = self.resolve_import(
                    &export.source_path,
                    &export.original_name,
                    base_directory,
                    depth,
                )?;
                Ok(Some(resolved))
            }
            BarrelExportMatch::Star(export) => {
                let resolved =
                    self.resolve_import(&export.source_path, name, base_directory, depth);
                Ok(resolved.ok())
            }
            BarrelExportMatch::None => Ok(None),
        }
    }

    pub fn detect_circular_imports(
        &mut self,
        source_file: &ParsedFile,
        base_directory: &Path,
    ) -> Vec<String> {
        let mut tracker = CircularImportTracker::new();
        self.check_circular_imports_recursive(&source_file.file_path, base_directory, &mut tracker);
        tracker.cycles
    }

    fn check_circular_imports_recursive(
        &mut self,
        file_path: &Path,
        base_directory: &Path,
        tracker: &mut CircularImportTracker,
    ) {
        if tracker.is_in_current_path(file_path) {
            tracker.record_cycle(file_path);
            return;
        }

        if tracker.is_visited(file_path) {
            return;
        }

        let Ok(parsed) = self.get_or_parse_file(file_path) else {
            return;
        };

        tracker.push_path(file_path);

        let source_directory = file_path.parent().unwrap_or(base_directory);
        let import_paths = extract_import_paths(&parsed, source_directory);

        for import_path in import_paths {
            self.check_circular_imports_recursive(&import_path, base_directory, tracker);
        }

        tracker.pop_and_mark_visited(file_path);
    }
}

fn is_relative_path(specifier: &str) -> bool {
    specifier.starts_with('.') || specifier.starts_with('/')
}

fn get_module_export_name(name: &ModuleExportName) -> String {
    match name {
        ModuleExportName::Ident(identifier) => identifier.sym.to_string(),
        ModuleExportName::Str(string) => string.value.to_string_lossy().into_owned(),
    }
}

pub fn build_imports_map(
    parser: &TsParser,
    source_file: &ParsedFile,
    base_directory: &Path,
) -> ImportResult<HashMap<String, ResolvedImport>> {
    let mut resolver = ImportResolver::new(parser);
    resolver.build_imports_map(source_file, base_directory)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::parser::imports::types::DeclarationType;
    use std::fs;
    use tempfile::TempDir;

    fn create_temp_project() -> TempDir {
        TempDir::new().expect("Failed to create temp dir")
    }

    fn write_file(directory: &Path, name: &str, content: &str) -> PathBuf {
        let path = directory.join(name);
        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent).expect("Failed to create parent dir");
        }
        fs::write(&path, content).expect("Failed to write file");
        path
    }

    #[test]
    fn test_resolver_creation() {
        let parser = TsParser::new();
        let resolver = ImportResolver::new(&parser);
        assert_eq!(resolver.max_depth, DEFAULT_MAX_IMPORT_DEPTH);
    }

    #[test]
    fn test_resolver_with_max_depth() {
        let parser = TsParser::new();
        let resolver = ImportResolver::new(&parser).with_max_depth(5);
        assert_eq!(resolver.max_depth, 5);
    }

    #[test]
    fn test_resolve_direct_import() {
        let temp_directory = create_temp_project();
        let base = temp_directory.path();

        write_file(
            base,
            "schema.ts",
            r"
            import { z } from 'zod';
            export const userSchema = z.object({ name: z.string() });
        ",
        );

        let main_path = write_file(
            base,
            "main.ts",
            r"
            import { userSchema } from './schema';
            export const x = userSchema;
        ",
        );

        let parser = TsParser::new();
        let parsed = parser.parse_file(&main_path).expect("Failed to parse");

        let mut resolver = ImportResolver::new(&parser);
        let imports = resolver
            .build_imports_map(&parsed, base)
            .expect("Failed to build imports map");

        assert!(imports.contains_key("userSchema"));
        let import_info = imports.get("userSchema").unwrap();
        assert_eq!(import_info.name, "userSchema");
        assert_eq!(import_info.declaration_type, DeclarationType::Variable);
        assert!(import_info.source_file.ends_with("schema.ts"));
    }

    #[test]
    fn test_resolve_barrel_file_import() {
        let temp_directory = create_temp_project();
        let base = temp_directory.path();

        write_file(
            base,
            "schemas/user.ts",
            r"
            import { z } from 'zod';
            export const userSchema = z.object({ name: z.string() });
        ",
        );

        write_file(
            base,
            "schemas/index.ts",
            r"
            export { userSchema } from './user';
        ",
        );

        let main_path = write_file(
            base,
            "main.ts",
            r"
            import { userSchema } from './schemas';
            export const x = userSchema;
        ",
        );

        let parser = TsParser::new();
        let parsed = parser.parse_file(&main_path).expect("Failed to parse");

        let mut resolver = ImportResolver::new(&parser);
        let imports = resolver
            .build_imports_map(&parsed, base)
            .expect("Failed to build imports map");

        assert!(imports.contains_key("userSchema"));
        let import_info = imports.get("userSchema").unwrap();
        assert!(import_info.source_file.ends_with("user.ts"));
    }

    #[test]
    fn test_resolve_star_export() {
        let temp_directory = create_temp_project();
        let base = temp_directory.path();

        write_file(
            base,
            "schemas/user.ts",
            r"
            import { z } from 'zod';
            export const userSchema = z.object({ name: z.string() });
        ",
        );

        write_file(
            base,
            "schemas/index.ts",
            r"
            export * from './user';
        ",
        );

        let main_path = write_file(
            base,
            "main.ts",
            r"
            import { userSchema } from './schemas';
            export const x = userSchema;
        ",
        );

        let parser = TsParser::new();
        let parsed = parser.parse_file(&main_path).expect("Failed to parse");

        let mut resolver = ImportResolver::new(&parser);
        let imports = resolver
            .build_imports_map(&parsed, base)
            .expect("Failed to build imports map");

        assert!(imports.contains_key("userSchema"));
        let import_info = imports.get("userSchema").unwrap();
        assert!(import_info.source_file.ends_with("user.ts"));
    }

    #[test]
    fn test_resolve_nested_barrel_files() {
        let temp_directory = create_temp_project();
        let base = temp_directory.path();

        write_file(
            base,
            "schemas/user/model.ts",
            r"
            import { z } from 'zod';
            export const userSchema = z.object({ name: z.string() });
        ",
        );

        write_file(
            base,
            "schemas/user/index.ts",
            r"
            export * from './model';
        ",
        );

        write_file(
            base,
            "schemas/index.ts",
            r"
            export * from './user';
        ",
        );

        let main_path = write_file(
            base,
            "main.ts",
            r"
            import { userSchema } from './schemas';
            export const x = userSchema;
        ",
        );

        let parser = TsParser::new();
        let parsed = parser.parse_file(&main_path).expect("Failed to parse");

        let mut resolver = ImportResolver::new(&parser);
        let imports = resolver
            .build_imports_map(&parsed, base)
            .expect("Failed to build imports map");

        assert!(imports.contains_key("userSchema"));
        let import_info = imports.get("userSchema").unwrap();
        assert!(import_info.source_file.ends_with("model.ts"));
    }

    #[test]
    fn test_resolve_class_declaration() {
        let temp_directory = create_temp_project();
        let base = temp_directory.path();

        write_file(
            base,
            "service.ts",
            r"
            export class UserService {
                getUser(id: string) {}
            }
        ",
        );

        let main_path = write_file(
            base,
            "main.ts",
            r"
            import { UserService } from './service';
            export const svc = new UserService();
        ",
        );

        let parser = TsParser::new();
        let parsed = parser.parse_file(&main_path).expect("Failed to parse");

        let mut resolver = ImportResolver::new(&parser);
        let imports = resolver
            .build_imports_map(&parsed, base)
            .expect("Failed to build imports map");

        assert!(imports.contains_key("UserService"));
        let import_info = imports.get("UserService").unwrap();
        assert_eq!(import_info.declaration_type, DeclarationType::Class);
    }

    #[test]
    fn test_resolve_interface_declaration() {
        let temp_directory = create_temp_project();
        let base = temp_directory.path();

        write_file(
            base,
            "types.ts",
            r"
            export interface User {
                name: string;
                email: string;
            }
        ",
        );

        let main_path = write_file(
            base,
            "main.ts",
            r"
            import { User } from './types';
            export const user: User = { name: '', email: '' };
        ",
        );

        let parser = TsParser::new();
        let parsed = parser.parse_file(&main_path).expect("Failed to parse");

        let mut resolver = ImportResolver::new(&parser);
        let imports = resolver
            .build_imports_map(&parsed, base)
            .expect("Failed to build imports map");

        assert!(imports.contains_key("User"));
        let import_info = imports.get("User").unwrap();
        assert_eq!(import_info.declaration_type, DeclarationType::Interface);
    }

    #[test]
    fn test_resolve_enum_declaration() {
        let temp_directory = create_temp_project();
        let base = temp_directory.path();

        write_file(
            base,
            "enums.ts",
            r"
            export enum Status {
                Active = 'ACTIVE',
                Inactive = 'INACTIVE',
            }
        ",
        );

        let main_path = write_file(
            base,
            "main.ts",
            r"
            import { Status } from './enums';
            export const status = Status.Active;
        ",
        );

        let parser = TsParser::new();
        let parsed = parser.parse_file(&main_path).expect("Failed to parse");

        let mut resolver = ImportResolver::new(&parser);
        let imports = resolver
            .build_imports_map(&parsed, base)
            .expect("Failed to build imports map");

        assert!(imports.contains_key("Status"));
        let import_info = imports.get("Status").unwrap();
        assert_eq!(import_info.declaration_type, DeclarationType::Enum);
    }

    #[test]
    fn test_resolve_function_declaration() {
        let temp_directory = create_temp_project();
        let base = temp_directory.path();

        write_file(
            base,
            "utils.ts",
            r"
            export function formatDate(date: Date): string {
                return date.toISOString();
            }
        ",
        );

        let main_path = write_file(
            base,
            "main.ts",
            r"
            import { formatDate } from './utils';
            export const date = formatDate(new Date());
        ",
        );

        let parser = TsParser::new();
        let parsed = parser.parse_file(&main_path).expect("Failed to parse");

        let mut resolver = ImportResolver::new(&parser);
        let imports = resolver
            .build_imports_map(&parsed, base)
            .expect("Failed to build imports map");

        assert!(imports.contains_key("formatDate"));
        let import_info = imports.get("formatDate").unwrap();
        assert_eq!(import_info.declaration_type, DeclarationType::Function);
    }

    #[test]
    fn test_skip_external_imports() {
        let temp_directory = create_temp_project();
        let base = temp_directory.path();

        let main_path = write_file(
            base,
            "main.ts",
            r"
            import { z } from 'zod';
            import { Injectable } from '@nestjs/common';
            export const schema = z.string();
        ",
        );

        let parser = TsParser::new();
        let parsed = parser.parse_file(&main_path).expect("Failed to parse");

        let mut resolver = ImportResolver::new(&parser);
        let imports = resolver
            .build_imports_map(&parsed, base)
            .expect("Failed to build imports map");

        assert!(!imports.contains_key("z"));
        assert!(!imports.contains_key("Injectable"));
    }

    #[test]
    fn test_aliased_import() {
        let temp_directory = create_temp_project();
        let base = temp_directory.path();

        write_file(
            base,
            "schema.ts",
            r"
            import { z } from 'zod';
            export const userSchema = z.object({ name: z.string() });
        ",
        );

        let main_path = write_file(
            base,
            "main.ts",
            r"
            import { userSchema as UserSchema } from './schema';
            export const x = UserSchema;
        ",
        );

        let parser = TsParser::new();
        let parsed = parser.parse_file(&main_path).expect("Failed to parse");

        let mut resolver = ImportResolver::new(&parser);
        let imports = resolver
            .build_imports_map(&parsed, base)
            .expect("Failed to build imports map");

        assert!(imports.contains_key("UserSchema"));
        assert!(!imports.contains_key("userSchema"));
    }

    #[test]
    fn test_unresolved_import() {
        let temp_directory = create_temp_project();
        let base = temp_directory.path();

        let main_path = write_file(
            base,
            "main.ts",
            r"
            import { something } from './nonexistent';
            export const x = something;
        ",
        );

        let parser = TsParser::new();
        let parsed = parser.parse_file(&main_path).expect("Failed to parse");

        let mut resolver = ImportResolver::new(&parser);
        let imports = resolver
            .build_imports_map(&parsed, base)
            .expect("Failed to build imports map");

        assert!(!imports.contains_key("something"));
    }

    #[test]
    fn test_max_depth_exceeded() {
        let parser = TsParser::new();
        let resolver = ImportResolver::new(&parser).with_max_depth(2);
        assert_eq!(resolver.max_depth, 2);
    }

    #[test]
    fn test_declaration_type_display() {
        assert_eq!(format!("{}", DeclarationType::Variable), "variable");
        assert_eq!(format!("{}", DeclarationType::Class), "class");
        assert_eq!(format!("{}", DeclarationType::Interface), "interface");
        assert_eq!(format!("{}", DeclarationType::Enum), "enum");
        assert_eq!(format!("{}", DeclarationType::Function), "function");
        assert_eq!(format!("{}", DeclarationType::TypeAlias), "type alias");
        assert_eq!(format!("{}", DeclarationType::Unknown), "unknown");
    }

    #[test]
    fn test_build_imports_map_convenience() {
        let temp_directory = create_temp_project();
        let base = temp_directory.path();

        write_file(
            base,
            "schema.ts",
            r"
            import { z } from 'zod';
            export const userSchema = z.object({ name: z.string() });
        ",
        );

        let main_path = write_file(
            base,
            "main.ts",
            r"
            import { userSchema } from './schema';
            export const x = userSchema;
        ",
        );

        let parser = TsParser::new();
        let parsed = parser.parse_file(&main_path).expect("Failed to parse");

        let imports =
            build_imports_map(&parser, &parsed, base).expect("Failed to build imports map");

        assert!(imports.contains_key("userSchema"));
    }

    #[test]
    fn test_resolve_type_alias() {
        let temp_directory = create_temp_project();
        let base = temp_directory.path();

        write_file(
            base,
            "types.ts",
            r"
            export type UserId = string;
        ",
        );

        let main_path = write_file(
            base,
            "main.ts",
            r"
            import { UserId } from './types';
            export const id: UserId = 'abc';
        ",
        );

        let parser = TsParser::new();
        let parsed = parser.parse_file(&main_path).expect("Failed to parse");

        let mut resolver = ImportResolver::new(&parser);
        let imports = resolver
            .build_imports_map(&parsed, base)
            .expect("Failed to build imports map");

        assert!(imports.contains_key("UserId"));
        let import_info = imports.get("UserId").unwrap();
        assert_eq!(import_info.declaration_type, DeclarationType::TypeAlias);
    }

    #[test]
    fn test_multiple_imports_from_same_file() {
        let temp_directory = create_temp_project();
        let base = temp_directory.path();

        write_file(
            base,
            "schemas.ts",
            r"
            import { z } from 'zod';
            export const userSchema = z.object({ name: z.string() });
            export const postSchema = z.object({ title: z.string() });
        ",
        );

        let main_path = write_file(
            base,
            "main.ts",
            r"
            import { userSchema, postSchema } from './schemas';
            export const x = userSchema;
            export const y = postSchema;
        ",
        );

        let parser = TsParser::new();
        let parsed = parser.parse_file(&main_path).expect("Failed to parse");

        let mut resolver = ImportResolver::new(&parser);
        let imports = resolver
            .build_imports_map(&parsed, base)
            .expect("Failed to build imports map");

        assert!(imports.contains_key("userSchema"));
        assert!(imports.contains_key("postSchema"));
    }

    #[test]
    fn test_mixed_barrel_and_direct_exports() {
        let temp_directory = create_temp_project();
        let base = temp_directory.path();

        write_file(
            base,
            "schemas/user.ts",
            r"
            import { z } from 'zod';
            export const userSchema = z.object({ name: z.string() });
        ",
        );

        write_file(
            base,
            "schemas/index.ts",
            r"
            import { z } from 'zod';
            export { userSchema } from './user';
            export const config = { version: '1.0' };
        ",
        );

        let main_path = write_file(
            base,
            "main.ts",
            r"
            import { userSchema, config } from './schemas';
            export const x = userSchema;
            export const y = config;
        ",
        );

        let parser = TsParser::new();
        let parsed = parser.parse_file(&main_path).expect("Failed to parse");

        let mut resolver = ImportResolver::new(&parser);
        let imports = resolver
            .build_imports_map(&parsed, base)
            .expect("Failed to build imports map");

        assert!(imports.contains_key("userSchema"));
        assert!(imports
            .get("userSchema")
            .unwrap()
            .source_file
            .ends_with("user.ts"));

        assert!(imports.contains_key("config"));
        assert!(imports
            .get("config")
            .unwrap()
            .source_file
            .ends_with("index.ts"));
    }
}
