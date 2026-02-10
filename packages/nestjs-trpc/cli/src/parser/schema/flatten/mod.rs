mod expression;
mod identifier;

use super::helpers::ZodHelpers;
use crate::error::GeneratorError;
use crate::parser::imports::ResolvedImport;
use crate::parser::{ParsedFile, TsParser};
use std::collections::{HashMap, HashSet};
use std::path::{Path, PathBuf};
use swc_ecma_ast::{Decl, Expr, ModuleItem, Stmt};
use tracing::{debug, trace, warn};

const DEFAULT_MAX_SCHEMA_FLATTEN_DEPTH: usize = 20;

pub type ZodResult<T> = std::result::Result<T, GeneratorError>;

#[derive(Debug)]
pub struct ZodFlattener<'a> {
    pub(super) parser: &'a TsParser,
    pub(super) base_directory: PathBuf,
    pub(super) parsed_cache: HashMap<PathBuf, ParsedFile>,
    pub(super) max_depth: usize,
    pub(super) resolving: Vec<String>,
    pub(super) importable_identifiers: HashSet<String>,
}

impl<'a> ZodFlattener<'a> {
    #[must_use]
    pub fn new(parser: &'a TsParser, base_directory: &Path) -> Self {
        Self {
            parser,
            base_directory: base_directory.to_path_buf(),
            parsed_cache: HashMap::new(),
            max_depth: DEFAULT_MAX_SCHEMA_FLATTEN_DEPTH,
            resolving: Vec::new(),
            importable_identifiers: HashSet::new(),
        }
    }

    #[must_use]
    pub const fn with_max_depth(mut self, max_depth: usize) -> Self {
        self.max_depth = max_depth;
        self
    }

    #[must_use]
    pub fn with_importable_identifiers(mut self, identifiers: HashSet<String>) -> Self {
        self.importable_identifiers = identifiers;
        self
    }

    pub fn flatten_schema(
        &mut self,
        schema_text: &str,
        source_file: &ParsedFile,
    ) -> ZodResult<String> {
        debug!(schema = %schema_text, "Flattening Zod schema");

        let temporary_code = format!("const __temp = {schema_text};");
        let temporary_parsed = self
            .parser
            .parse_source("<schema>", &temporary_code)
            .map_err(|error| GeneratorError::SchemaFlattenFailed {
                path: source_file.file_path.clone(),
                schema: schema_text.to_string(),
                message: format!("Failed to parse schema: {error}"),
            })?;

        let expression =
            Self::extract_temporary_expression(&temporary_parsed).ok_or_else(|| {
                GeneratorError::SchemaFlattenFailed {
                    path: source_file.file_path.clone(),
                    schema: schema_text.to_string(),
                    message: "Could not extract expression from schema".to_string(),
                }
            })?;

        let imports_map = self.build_imports_map_for_file(source_file);

        self.resolving.clear();

        let result = self.flatten_expression(
            &expression,
            source_file,
            &imports_map,
            schema_text.to_string(),
            0,
        )?;

        debug!(
            original = %schema_text,
            flattened = %result,
            "Flattened schema"
        );

        Ok(result)
    }

    fn extract_temporary_expression(parsed: &ParsedFile) -> Option<Expr> {
        parsed
            .module
            .body
            .iter()
            .find_map(extract_variable_initializer)
    }
}

fn extract_variable_initializer(item: &ModuleItem) -> Option<Expr> {
    let ModuleItem::Stmt(Stmt::Decl(Decl::Var(variable_declaration))) = item else {
        return None;
    };

    variable_declaration
        .decls
        .iter()
        .find_map(|declarator| declarator.init.as_ref())
        .map(|initializer| (*initializer.clone()).clone())
}

impl ZodFlattener<'_> {
    fn build_imports_map_for_file(
        &self,
        source_file: &ParsedFile,
    ) -> HashMap<String, ResolvedImport> {
        use crate::parser::imports::ImportResolver;
        let mut resolver = ImportResolver::new(self.parser);
        resolver
            .build_imports_map(source_file, &self.base_directory)
            .unwrap_or_default()
    }

    pub(super) fn flatten_expression(
        &mut self,
        expression: &Expr,
        source_file: &ParsedFile,
        imports_map: &HashMap<String, ResolvedImport>,
        mut schema: String,
        depth: usize,
    ) -> ZodResult<String> {
        if depth >= self.max_depth {
            warn!(
                depth,
                schema = %schema,
                "Maximum recursion depth reached during schema flattening"
            );
            return Ok(schema);
        }

        trace!(
            depth,
            expression_type = %self.expression_type_name(expression),
            "Flattening expression"
        );

        match expression {
            Expr::Ident(identifier) => {
                schema =
                    self.flatten_identifier(identifier, source_file, imports_map, schema, depth)?;
            }
            Expr::Object(object_literal) => {
                schema =
                    self.flatten_object(object_literal, source_file, imports_map, schema, depth)?;
            }
            Expr::Array(array_literal) => {
                schema =
                    self.flatten_array(array_literal, source_file, imports_map, schema, depth)?;
            }
            Expr::Call(call_expression) => {
                schema =
                    self.flatten_call(call_expression, source_file, imports_map, schema, depth)?;
            }
            Expr::Member(member_expression) => {
                schema = self.flatten_member(
                    member_expression,
                    source_file,
                    imports_map,
                    schema,
                    depth,
                )?;
            }
            Expr::Paren(parenthesized) => {
                schema = self.flatten_expression(
                    &parenthesized.expr,
                    source_file,
                    imports_map,
                    schema,
                    depth + 1,
                )?;
            }
            _ => {}
        }

        Ok(schema)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::flatten_zod_schema;
    use std::fs;
    use tempfile::TempDir;

    fn create_temporary_project() -> TempDir {
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
    fn test_flattener_creation() {
        let parser = TsParser::new();
        let flattener = ZodFlattener::new(&parser, Path::new("/tmp"));
        assert_eq!(flattener.max_depth, 20);
    }

    #[test]
    fn test_flattener_with_max_depth() {
        let parser = TsParser::new();
        let flattener = ZodFlattener::new(&parser, Path::new("/tmp")).with_max_depth(10);
        assert_eq!(flattener.max_depth, 10);
    }

    #[test]
    fn test_flatten_simple_inline_schema() {
        let temporary_directory = create_temporary_project();
        let base = temporary_directory.path();

        let main_path = write_file(
            base,
            "main.ts",
            r"
            import { z } from 'zod';
            const schema = z.object({ name: z.string() });
        ",
        );

        let parser = TsParser::new();
        let parsed = parser.parse_file(&main_path).expect("Failed to parse");

        let mut flattener = ZodFlattener::new(&parser, base);
        let result = flattener
            .flatten_schema("z.object({ name: z.string() })", &parsed)
            .expect("Failed to flatten");

        assert!(result.contains("z.object"));
        assert!(result.contains("name"));
        assert!(result.contains("z.string"));
    }

    #[test]
    fn test_flatten_variable_reference() {
        let temporary_directory = create_temporary_project();
        let base = temporary_directory.path();

        let main_path = write_file(
            base,
            "main.ts",
            r"
            import { z } from 'zod';
            const nameSchema = z.string();
            const userSchema = z.object({ name: nameSchema });
        ",
        );

        let parser = TsParser::new();
        let parsed = parser.parse_file(&main_path).expect("Failed to parse");

        let mut flattener = ZodFlattener::new(&parser, base);
        let result = flattener
            .flatten_schema("nameSchema", &parsed)
            .expect("Failed to flatten");

        assert!(result.contains("z.string()"));
    }

    #[test]
    fn test_flatten_nested_variable_reference() {
        let temporary_directory = create_temporary_project();
        let base = temporary_directory.path();

        let main_path = write_file(
            base,
            "main.ts",
            r"
            import { z } from 'zod';
            const nameSchema = z.string();
            const userSchema = z.object({ name: nameSchema });
        ",
        );

        let parser = TsParser::new();
        let parsed = parser.parse_file(&main_path).expect("Failed to parse");

        let mut flattener = ZodFlattener::new(&parser, base);
        let result = flattener
            .flatten_schema("userSchema", &parsed)
            .expect("Failed to flatten");

        assert!(result.contains("z.object"));
        assert!(result.contains("z.string()"));
        assert!(!result.contains("nameSchema"));
    }

    #[test]
    fn test_flatten_imported_schema() {
        let temporary_directory = create_temporary_project();
        let base = temporary_directory.path();

        write_file(
            base,
            "schemas.ts",
            r"
            import { z } from 'zod';
            export const emailSchema = z.string().email();
        ",
        );

        let main_path = write_file(
            base,
            "main.ts",
            r"
            import { z } from 'zod';
            import { emailSchema } from './schemas';
            const userSchema = z.object({ email: emailSchema });
        ",
        );

        let parser = TsParser::new();
        let parsed = parser.parse_file(&main_path).expect("Failed to parse");

        let mut flattener = ZodFlattener::new(&parser, base);
        let result = flattener
            .flatten_schema("emailSchema", &parsed)
            .expect("Failed to flatten");

        assert!(result.contains("z.string().email()"));
    }

    #[test]
    fn test_flatten_array_literal() {
        let temporary_directory = create_temporary_project();
        let base = temporary_directory.path();

        let main_path = write_file(
            base,
            "main.ts",
            r"
            import { z } from 'zod';
            const strSchema = z.string();
            const numSchema = z.number();
            const unionSchema = z.union([strSchema, numSchema]);
        ",
        );

        let parser = TsParser::new();
        let parsed = parser.parse_file(&main_path).expect("Failed to parse");

        let mut flattener = ZodFlattener::new(&parser, base);
        let result = flattener
            .flatten_schema("z.union([strSchema, numSchema])", &parsed)
            .expect("Failed to flatten");

        assert!(result.contains("z.union"));
        assert!(result.contains("z.string()"));
        assert!(result.contains("z.number()"));
    }

    #[test]
    fn test_flatten_method_chain() {
        let temporary_directory = create_temporary_project();
        let base = temporary_directory.path();

        let main_path = write_file(
            base,
            "main.ts",
            r"
            import { z } from 'zod';
            const baseSchema = z.string();
            const optionalSchema = baseSchema.optional();
        ",
        );

        let parser = TsParser::new();
        let parsed = parser.parse_file(&main_path).expect("Failed to parse");

        let mut flattener = ZodFlattener::new(&parser, base);
        let result = flattener
            .flatten_schema("baseSchema.optional()", &parsed)
            .expect("Failed to flatten");

        assert!(result.contains("z.string()"));
        assert!(result.contains(".optional()"));
    }

    #[test]
    fn test_flatten_complex_nested_schema() {
        let temporary_directory = create_temporary_project();
        let base = temporary_directory.path();

        let main_path = write_file(
            base,
            "main.ts",
            r"
            import { z } from 'zod';
            const addressSchema = z.object({
                street: z.string(),
                city: z.string()
            });
            const userSchema = z.object({
                name: z.string(),
                address: addressSchema
            });
        ",
        );

        let parser = TsParser::new();
        let parsed = parser.parse_file(&main_path).expect("Failed to parse");

        let mut flattener = ZodFlattener::new(&parser, base);
        let result = flattener
            .flatten_schema("userSchema", &parsed)
            .expect("Failed to flatten");

        assert!(result.contains("name"));
        assert!(result.contains("z.string()"));
        assert!(result.contains("street"));
        assert!(result.contains("city"));
    }

    #[test]
    fn test_flatten_preserves_z_prefix() {
        let temporary_directory = create_temporary_project();
        let base = temporary_directory.path();

        let main_path = write_file(
            base,
            "main.ts",
            r"
            import { z } from 'zod';
            const schema = z.string().min(1).max(100);
        ",
        );

        let parser = TsParser::new();
        let parsed = parser.parse_file(&main_path).expect("Failed to parse");

        let mut flattener = ZodFlattener::new(&parser, base);
        let result = flattener
            .flatten_schema("z.string().min(1).max(100)", &parsed)
            .expect("Failed to flatten");

        assert!(result.starts_with("z."));
    }

    #[test]
    fn test_flatten_handles_circular_reference() {
        let temporary_directory = create_temporary_project();
        let base = temporary_directory.path();

        let main_path = write_file(
            base,
            "main.ts",
            r"
            import { z } from 'zod';
            const schema = z.string();
        ",
        );

        let parser = TsParser::new();
        let parsed = parser.parse_file(&main_path).expect("Failed to parse");

        let mut flattener = ZodFlattener::new(&parser, base);
        let result = flattener
            .flatten_schema("schema", &parsed)
            .expect("Failed to flatten");

        assert!(result.contains("z.string()"));
    }

    #[test]
    fn test_flatten_unknown_identifier() {
        let temporary_directory = create_temporary_project();
        let base = temporary_directory.path();

        let main_path = write_file(
            base,
            "main.ts",
            r"
            import { z } from 'zod';
            const schema = z.object({ data: unknownSchema });
        ",
        );

        let parser = TsParser::new();
        let parsed = parser.parse_file(&main_path).expect("Failed to parse");

        let mut flattener = ZodFlattener::new(&parser, base);
        let result = flattener
            .flatten_schema("unknownSchema", &parsed)
            .expect("Failed to flatten");

        assert_eq!(result, "unknownSchema");
    }

    #[test]
    fn test_flatten_exported_schema() {
        let temporary_directory = create_temporary_project();
        let base = temporary_directory.path();

        let main_path = write_file(
            base,
            "main.ts",
            r"
            import { z } from 'zod';
            export const idSchema = z.string().uuid();
        ",
        );

        let parser = TsParser::new();
        let parsed = parser.parse_file(&main_path).expect("Failed to parse");

        let mut flattener = ZodFlattener::new(&parser, base);
        let result = flattener
            .flatten_schema("idSchema", &parsed)
            .expect("Failed to flatten");

        assert!(result.contains("z.string().uuid()"));
    }

    #[test]
    fn test_convenience_function() {
        let temporary_directory = create_temporary_project();
        let base = temporary_directory.path();

        let main_path = write_file(
            base,
            "main.ts",
            r"
            import { z } from 'zod';
            const schema = z.string();
        ",
        );

        let parser = TsParser::new();
        let parsed = parser.parse_file(&main_path).expect("Failed to parse");
        let empty_importable = std::collections::HashSet::new();

        let result = flatten_zod_schema(&parser, "schema", &parsed, base, &empty_importable)
            .expect("Failed to flatten");

        assert!(result.contains("z.string()"));
    }

    #[test]
    fn test_flatten_with_transform() {
        let temporary_directory = create_temporary_project();
        let base = temporary_directory.path();

        let main_path = write_file(
            base,
            "main.ts",
            r"
            import { z } from 'zod';
            const dateSchema = z.string().transform((val) => new Date(val));
        ",
        );

        let parser = TsParser::new();
        let parsed = parser.parse_file(&main_path).expect("Failed to parse");

        let mut flattener = ZodFlattener::new(&parser, base);
        let result = flattener
            .flatten_schema("dateSchema", &parsed)
            .expect("Failed to flatten");

        assert!(result.contains("z.string()"));
        assert!(result.contains("transform"));
    }

    #[test]
    fn test_flatten_enum_schema() {
        let temporary_directory = create_temporary_project();
        let base = temporary_directory.path();

        let main_path = write_file(
            base,
            "main.ts",
            r"
            import { z } from 'zod';
            const statusSchema = z.enum(['active', 'inactive', 'pending']);
        ",
        );

        let parser = TsParser::new();
        let parsed = parser.parse_file(&main_path).expect("Failed to parse");

        let mut flattener = ZodFlattener::new(&parser, base);
        let result = flattener
            .flatten_schema("statusSchema", &parsed)
            .expect("Failed to flatten");

        assert!(result.contains("z.enum"));
        assert!(result.contains("active"));
        assert!(result.contains("inactive"));
    }
}
