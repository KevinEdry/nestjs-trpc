pub mod server;
pub mod types;

use std::collections::HashSet;
use std::fmt::Write;
use std::path::Path;

use crate::parser::module::TransformerInfo;

pub use server::{generate_server_file, ServerGenerator};
pub use types::{generate_types_file, TypesGenerator};

pub type GeneratorResult<T> = std::result::Result<T, crate::error::GeneratorError>;

#[derive(Debug, Clone)]
pub struct StaticGenerator {
    pub(crate) use_single_quotes: bool,

    pub(crate) use_semicolons: bool,

    pub(crate) transformer: Option<TransformerInfo>,
}

impl Default for StaticGenerator {
    fn default() -> Self {
        Self::new()
    }
}

impl StaticGenerator {
    #[must_use]
    pub const fn new() -> Self {
        Self {
            use_single_quotes: false,
            use_semicolons: true,
            transformer: None,
        }
    }

    #[must_use]
    pub const fn with_single_quotes(mut self, use_single_quotes: bool) -> Self {
        self.use_single_quotes = use_single_quotes;
        self
    }

    #[must_use]
    pub const fn with_semicolons(mut self, use_semicolons: bool) -> Self {
        self.use_semicolons = use_semicolons;
        self
    }

    #[must_use]
    pub fn with_transformer(mut self, transformer: Option<TransformerInfo>) -> Self {
        self.transformer = transformer;
        self
    }

    const fn quote(&self) -> char {
        if self.use_single_quotes {
            '\''
        } else {
            '"'
        }
    }

    const fn terminator(&self) -> &str {
        if self.use_semicolons {
            ";"
        } else {
            ""
        }
    }

    #[must_use]
    pub fn generate_static_declarations(&self) -> String {
        let q = self.quote();
        let term = self.terminator();

        let mut output = String::new();

        let _ = writeln!(
            output,
            "import {{ initTRPC }} from {q}@trpc/server{q}{term}"
        );
        let _ = writeln!(output, "import {{ z }} from {q}zod{q}{term}");

        if let Some(transformer) = &self.transformer {
            let _ = writeln!(output, "{}", self.generate_transformer_import(transformer));
        }

        output.push('\n');

        let _ = writeln!(output, "{}", self.generate_t_declaration());
        let _ = writeln!(output, "const publicProcedure = t.procedure{term}");

        output
    }

    #[must_use]
    pub fn generate_trpc_import(&self) -> String {
        let q = self.quote();
        let term = self.terminator();
        format!("import {{ initTRPC }} from {q}@trpc/server{q}{term}")
    }

    #[must_use]
    pub fn generate_zod_import(&self) -> String {
        let q = self.quote();
        let term = self.terminator();
        format!("import {{ z }} from {q}zod{q}{term}")
    }

    #[must_use]
    pub fn generate_t_declaration(&self) -> String {
        let term = self.terminator();
        self.transformer.as_ref().map_or_else(
            || format!("const t = initTRPC.create(){term}"),
            |transformer| {
                let name = &transformer.import_name;
                format!("const t = initTRPC.create({{ transformer: {name} }}){term}")
            },
        )
    }

    fn generate_transformer_import(&self, transformer: &TransformerInfo) -> String {
        let q = self.quote();
        let term = self.terminator();
        let name = &transformer.import_name;
        let package = &transformer.package_name;

        if transformer.is_default_import {
            format!("import {name} from {q}{package}{q}{term}")
        } else {
            format!("import {{ {name} }} from {q}{package}{q}{term}")
        }
    }

    #[must_use]
    pub fn generate_public_procedure_declaration(&self) -> String {
        let term = self.terminator();
        format!("const publicProcedure = t.procedure{term}")
    }

    pub fn generate_schema_imports<'a, I>(
        &self,
        schema_names: I,
        schema_locations: &std::collections::HashMap<String, std::path::PathBuf>,
        output_file_path: &Path,
    ) -> String
    where
        I: IntoIterator<Item = &'a str>,
    {
        let output_dir = output_file_path.parent().unwrap_or_else(|| Path::new("."));

        let mut seen_names: HashSet<&str> = HashSet::new();
        let mut path_order: Vec<String> = Vec::new();
        let mut names_by_path: std::collections::HashMap<String, Vec<&str>> =
            std::collections::HashMap::new();

        group_schema_names_by_path(
            schema_names,
            schema_locations,
            output_dir,
            &mut seen_names,
            &mut path_order,
            &mut names_by_path,
        );

        let q = self.quote();
        let term = self.terminator();

        path_order
            .iter()
            .filter_map(|path| {
                let names = names_by_path.get(path)?;
                let names_joined = names.join(", ");
                Some(format!(
                    "import {{ {names_joined} }} from {q}{path}{q}{term}\n"
                ))
            })
            .collect()
    }

    fn calculate_relative_path(from_dir: &Path, to_file: &Path) -> String {
        let relative = pathdiff::diff_paths(to_file, from_dir).map_or_else(
            || to_file.to_string_lossy().to_string(),
            |p| p.to_string_lossy().to_string(),
        );

        let without_ext = relative
            .strip_suffix(".ts")
            .or_else(|| relative.strip_suffix(".tsx"))
            .unwrap_or(&relative);

        if without_ext.starts_with('.') || without_ext.starts_with('/') {
            without_ext.to_string()
        } else {
            format!("./{without_ext}")
        }
    }
}

fn group_schema_names_by_path<'a, I>(
    schema_names: I,
    schema_locations: &std::collections::HashMap<String, std::path::PathBuf>,
    output_dir: &Path,
    seen_names: &mut HashSet<&'a str>,
    path_order: &mut Vec<String>,
    names_by_path: &mut std::collections::HashMap<String, Vec<&'a str>>,
) where
    I: IntoIterator<Item = &'a str>,
{
    for name in schema_names {
        if !seen_names.insert(name) {
            continue;
        }
        let Some(source_path) = schema_locations.get(name) else {
            continue;
        };
        let import_path = resolve_import_path(output_dir, source_path);
        if !names_by_path.contains_key(&import_path) {
            path_order.push(import_path.clone());
        }
        names_by_path.entry(import_path).or_default().push(name);
    }
}

fn resolve_import_path(output_dir: &Path, source_path: &Path) -> String {
    let is_external_package = output_dir.is_absolute() && !source_path.is_absolute();
    if is_external_package {
        source_path.to_string_lossy().to_string()
    } else {
        StaticGenerator::calculate_relative_path(output_dir, source_path)
    }
}

#[must_use]
pub fn generate_static_section() -> String {
    StaticGenerator::new().generate_static_declarations()
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashMap;

    #[test]
    fn test_static_generator_creation() {
        let generator = StaticGenerator::new();
        assert!(!generator.use_single_quotes);
        assert!(generator.use_semicolons);
    }

    #[test]
    fn test_static_generator_default() {
        let generator = StaticGenerator::default();
        assert!(!generator.use_single_quotes);
        assert!(generator.use_semicolons);
    }

    #[test]
    fn test_generate_static_declarations() {
        let generator = StaticGenerator::new();
        let output = generator.generate_static_declarations();

        // Verify import declarations
        assert!(output.contains("import { initTRPC } from \"@trpc/server\";"));
        assert!(output.contains("import { z } from \"zod\";"));

        // Verify variable declarations
        assert!(output.contains("const t = initTRPC.create();"));
        assert!(output.contains("const publicProcedure = t.procedure;"));
    }

    #[test]
    fn test_generate_static_declarations_with_single_quotes() {
        let generator = StaticGenerator::new().with_single_quotes(true);
        let output = generator.generate_static_declarations();

        assert!(output.contains("import { initTRPC } from '@trpc/server';"));
        assert!(output.contains("import { z } from 'zod';"));
    }

    #[test]
    fn test_generate_static_declarations_without_semicolons() {
        let generator = StaticGenerator::new().with_semicolons(false);
        let output = generator.generate_static_declarations();

        assert!(output.contains("import { initTRPC } from \"@trpc/server\"\n"));
        assert!(output.contains("import { z } from \"zod\"\n"));
        assert!(output.contains("const t = initTRPC.create()\n"));
        assert!(output.contains("const publicProcedure = t.procedure\n"));
        // Verify no semicolons
        assert!(!output.contains(';'));
    }

    #[test]
    fn test_generate_trpc_import() {
        let generator = StaticGenerator::new();
        let output = generator.generate_trpc_import();
        assert_eq!(output, "import { initTRPC } from \"@trpc/server\";");
    }

    #[test]
    fn test_generate_zod_import() {
        let generator = StaticGenerator::new();
        let output = generator.generate_zod_import();
        assert_eq!(output, "import { z } from \"zod\";");
    }

    #[test]
    fn test_generate_t_declaration() {
        let generator = StaticGenerator::new();
        let output = generator.generate_t_declaration();
        assert_eq!(output, "const t = initTRPC.create();");
    }

    #[test]
    fn test_generate_public_procedure_declaration() {
        let generator = StaticGenerator::new();
        let output = generator.generate_public_procedure_declaration();
        assert_eq!(output, "const publicProcedure = t.procedure;");
    }

    #[test]
    fn test_generate_schema_imports() {
        let generator = StaticGenerator::new();

        let mut schema_locations: HashMap<String, std::path::PathBuf> = HashMap::new();
        schema_locations.insert(
            "userSchema".to_string(),
            std::path::PathBuf::from("src/schemas/user.schema.ts"),
        );
        schema_locations.insert(
            "postSchema".to_string(),
            std::path::PathBuf::from("src/schemas/post.schema.ts"),
        );

        let output_path = Path::new("src/@generated/server.ts");
        let schema_names = vec!["userSchema", "postSchema"];

        let output =
            generator.generate_schema_imports(schema_names, &schema_locations, output_path);

        // Verify imports are generated with relative paths
        assert!(output.contains("import { userSchema }"));
        assert!(output.contains("import { postSchema }"));
        // Path should be relative from @generated to schemas
        assert!(output.contains("../schemas/user.schema"));
        assert!(output.contains("../schemas/post.schema"));
    }

    #[test]
    fn test_generate_schema_imports_empty() {
        let generator = StaticGenerator::new();
        let schema_locations: HashMap<String, std::path::PathBuf> = HashMap::new();
        let output_path = Path::new("src/@generated/server.ts");

        let output = generator.generate_schema_imports(
            std::iter::empty::<&str>(),
            &schema_locations,
            output_path,
        );

        assert!(output.is_empty());
    }

    #[test]
    fn test_calculate_relative_path() {
        // Same directory
        let result = StaticGenerator::calculate_relative_path(
            Path::new("src/@generated"),
            Path::new("src/@generated/types.ts"),
        );
        assert_eq!(result, "./types");

        // Parent directory
        let result = StaticGenerator::calculate_relative_path(
            Path::new("src/@generated"),
            Path::new("src/schemas/user.ts"),
        );
        assert_eq!(result, "../schemas/user");
    }

    #[test]
    fn test_static_declarations_format() {
        let generator = StaticGenerator::new();
        let output = generator.generate_static_declarations();

        // Verify proper formatting with blank line between imports and declarations
        let lines: Vec<&str> = output.lines().collect();
        assert_eq!(lines.len(), 5); // 2 imports + 1 blank + 2 declarations

        // First two lines are imports
        assert!(lines[0].starts_with("import"));
        assert!(lines[1].starts_with("import"));

        // Third line is blank
        assert!(lines[2].is_empty());

        // Last two lines are declarations
        assert!(lines[3].starts_with("const t"));
        assert!(lines[4].starts_with("const publicProcedure"));
    }

    #[test]
    fn test_convenience_function() {
        let output = generate_static_section();

        // Verify it produces the same output as the method
        let generator = StaticGenerator::new();
        let expected = generator.generate_static_declarations();

        assert_eq!(output, expected);
    }

    #[test]
    fn test_builder_pattern_chaining() {
        let generator = StaticGenerator::new()
            .with_single_quotes(true)
            .with_semicolons(false);

        assert!(generator.use_single_quotes);
        assert!(!generator.use_semicolons);
    }

    #[test]
    fn test_output_matches_expected_format() {
        let generator = StaticGenerator::new();
        let output = generator.generate_static_declarations();

        // This matches the format from the spec and examples
        let expected = r#"import { initTRPC } from "@trpc/server";
import { z } from "zod";

const t = initTRPC.create();
const publicProcedure = t.procedure;
"#;

        assert_eq!(output, expected);
    }

    // ========================================================================
    // Transformer output tests
    // ========================================================================

    #[test]
    fn test_generate_static_declarations_with_default_transformer() {
        let transformer = TransformerInfo {
            package_name: "superjson".to_string(),
            import_name: "superjson".to_string(),
            is_default_import: true,
        };
        let generator = StaticGenerator::new().with_transformer(Some(transformer));
        let output = generator.generate_static_declarations();

        assert!(output.contains("import superjson from \"superjson\";"));
        assert!(output.contains("const t = initTRPC.create({ transformer: superjson });"));
        assert!(output.contains("const publicProcedure = t.procedure;"));
    }

    #[test]
    fn test_generate_static_declarations_with_named_transformer() {
        let transformer = TransformerInfo {
            package_name: "custom-transformer".to_string(),
            import_name: "myTransformer".to_string(),
            is_default_import: false,
        };
        let generator = StaticGenerator::new().with_transformer(Some(transformer));
        let output = generator.generate_static_declarations();

        assert!(output.contains("import { myTransformer } from \"custom-transformer\";"));
        assert!(output.contains("const t = initTRPC.create({ transformer: myTransformer });"));
    }

    #[test]
    fn test_generate_static_declarations_transformer_with_single_quotes() {
        let transformer = TransformerInfo {
            package_name: "superjson".to_string(),
            import_name: "superjson".to_string(),
            is_default_import: true,
        };
        let generator = StaticGenerator::new()
            .with_single_quotes(true)
            .with_transformer(Some(transformer));
        let output = generator.generate_static_declarations();

        assert!(output.contains("import superjson from 'superjson';"));
        assert!(output.contains("import { initTRPC } from '@trpc/server';"));
    }

    #[test]
    fn test_generate_static_declarations_transformer_without_semicolons() {
        let transformer = TransformerInfo {
            package_name: "superjson".to_string(),
            import_name: "superjson".to_string(),
            is_default_import: true,
        };
        let generator = StaticGenerator::new()
            .with_semicolons(false)
            .with_transformer(Some(transformer));
        let output = generator.generate_static_declarations();

        assert!(output.contains("import superjson from \"superjson\"\n"));
        assert!(output.contains("const t = initTRPC.create({ transformer: superjson })\n"));
        assert!(!output.contains(';'));
    }

    #[test]
    fn test_generate_t_declaration_with_transformer() {
        let transformer = TransformerInfo {
            package_name: "superjson".to_string(),
            import_name: "superjson".to_string(),
            is_default_import: true,
        };
        let generator = StaticGenerator::new().with_transformer(Some(transformer));
        let output = generator.generate_t_declaration();

        assert_eq!(
            output,
            "const t = initTRPC.create({ transformer: superjson });"
        );
    }

    #[test]
    fn test_generate_t_declaration_without_transformer() {
        let generator = StaticGenerator::new();
        let output = generator.generate_t_declaration();
        assert_eq!(output, "const t = initTRPC.create();");
    }

    #[test]
    fn test_with_transformer_builder() {
        let transformer = TransformerInfo {
            package_name: "superjson".to_string(),
            import_name: "superjson".to_string(),
            is_default_import: true,
        };
        let generator = StaticGenerator::new().with_transformer(Some(transformer.clone()));
        assert!(generator.transformer.is_some());
        assert_eq!(generator.transformer.unwrap(), transformer);
    }

    #[test]
    fn test_with_transformer_none() {
        let generator = StaticGenerator::new().with_transformer(None);
        assert!(generator.transformer.is_none());
    }

    #[test]
    fn test_transformer_output_format() {
        let transformer = TransformerInfo {
            package_name: "superjson".to_string(),
            import_name: "superjson".to_string(),
            is_default_import: true,
        };
        let generator = StaticGenerator::new().with_transformer(Some(transformer));
        let output = generator.generate_static_declarations();

        let expected = r#"import { initTRPC } from "@trpc/server";
import { z } from "zod";
import superjson from "superjson";

const t = initTRPC.create({ transformer: superjson });
const publicProcedure = t.procedure;
"#;

        assert_eq!(output, expected);
    }
}
