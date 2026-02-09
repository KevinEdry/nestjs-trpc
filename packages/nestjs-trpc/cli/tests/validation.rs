#![allow(clippy::unwrap_used, clippy::expect_used)]

use nestjs_trpc::run_generation;
use std::fs;
use std::path::PathBuf;
use std::process::Command;
use tempfile::TempDir;

fn nestjs_trpc_package() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .parent()
        .expect("Failed to find nestjs-trpc package")
        .to_path_buf()
}

fn fixtures_directory() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("tests/fixtures")
}

fn project_root() -> PathBuf {
    nestjs_trpc_package()
        .parent()
        .expect("Failed to find packages dir")
        .parent()
        .expect("Failed to find workspace root")
        .to_path_buf()
}

fn find_tsc_binary() -> Option<PathBuf> {
    let workspace_tsc = project_root().join("node_modules/.bin/tsc");
    if workspace_tsc.exists() {
        return Some(workspace_tsc);
    }

    None
}

fn build_tsconfig(nestjs_trpc_node_modules: &std::path::Path) -> String {
    format!(
        r#"{{
    "compilerOptions": {{
        "target": "ES2020",
        "module": "commonjs",
        "strict": false,
        "skipLibCheck": true,
        "noEmit": true,
        "esModuleInterop": true,
        "moduleResolution": "node",
        "typeRoots": ["{}/node_modules/@types"],
        "baseUrl": ".",
        "paths": {{
            "@trpc/server": ["{}/node_modules/@trpc/server"],
            "zod": ["{}/node_modules/zod"]
        }}
    }},
    "include": ["server.ts"],
    "files": ["stubs.d.ts"]
}}"#,
        nestjs_trpc_node_modules.display(),
        nestjs_trpc_node_modules.display(),
        nestjs_trpc_node_modules.display()
    )
}

fn create_stub_declarations(output_directory: &std::path::Path, generated_content: &str) {
    use std::fmt::Write;

    let stub_names = extract_schema_references(generated_content);
    let external_modules = extract_external_module_specifiers(generated_content);

    let mut declarations = String::from("// Auto-generated stub declarations for validation\n");
    declarations.push_str("// Using any type to allow all Zod schema methods\n\n");
    for name in stub_names {
        writeln!(declarations, "declare const {name}: any;").unwrap();
    }
    for module_specifier in &external_modules {
        writeln!(declarations, "declare module \"{module_specifier}\" {{").unwrap();
        let names = extract_import_names_for_module(generated_content, module_specifier);
        for name in names {
            writeln!(declarations, "  export const {name}: any;").unwrap();
        }
        writeln!(declarations, "}}").unwrap();
    }

    let stub_path = output_directory.join("stubs.d.ts");
    fs::write(&stub_path, declarations).expect("Failed to write stub declarations");
}

fn extract_external_module_specifiers(content: &str) -> Vec<String> {
    use std::collections::HashSet;

    let well_known = ["@trpc/server", "zod"];
    let mut modules = HashSet::new();

    for line in content.lines() {
        let trimmed = line.trim();
        let is_import = trimmed.starts_with("import ");
        if !is_import {
            continue;
        }

        let Some(from_index) = trimmed.find("from ") else {
            continue;
        };
        let after_from = &trimmed[from_index + 5..];
        let quote = after_from.chars().next().unwrap_or(' ');
        if quote != '"' && quote != '\'' {
            continue;
        }
        let after_quote = &after_from[1..];
        let Some(end) = after_quote.find(quote) else {
            continue;
        };
        let specifier = &after_quote[..end];

        let is_relative = specifier.starts_with('.') || specifier.starts_with('/');
        let is_well_known = well_known.contains(&specifier);
        if !is_relative && !is_well_known {
            modules.insert(specifier.to_string());
        }
    }

    modules.into_iter().collect()
}

fn extract_import_names_for_module(content: &str, module_specifier: &str) -> Vec<String> {
    let mut names = Vec::new();

    for line in content.lines() {
        let trimmed = line.trim();
        if !trimmed.contains(module_specifier) {
            continue;
        }

        let new_names: Vec<String> = parse_import_names(trimmed)
            .into_iter()
            .filter(|name| !names.contains(name))
            .collect();
        names.extend(new_names);
    }

    names
}

fn parse_import_names(line: &str) -> Vec<String> {
    let Some(imports_section) = line.split("import {").nth(1) else {
        return vec![];
    };
    let Some(imports) = imports_section.split("} from").next() else {
        return vec![];
    };
    imports
        .split(',')
        .map(|name| name.trim().to_string())
        .filter(|name| !name.is_empty())
        .collect()
}

fn extract_pattern_schemas(line: &str) -> Vec<String> {
    let patterns = [".input(", ".output(", "z.array("];
    let mut schemas = vec![];

    for pattern in patterns {
        let Some(start_index) = line.find(pattern) else {
            continue;
        };
        let after_pattern = &line[start_index + pattern.len()..];
        let Some(schema_name) = extract_identifier(after_pattern) else {
            continue;
        };
        if !schema_name.starts_with("z.") {
            schemas.push(schema_name);
        }
    }
    schemas
}

fn extract_enum_like_references(content: &str) -> Vec<String> {
    use regex::Regex;

    let pattern = Regex::new(r"\b([A-Z][a-zA-Z0-9_]+)\.[A-Z][a-zA-Z0-9_]+\b").unwrap();
    let mut names = Vec::new();

    for captures in pattern.captures_iter(content) {
        let name = captures[1].to_string();
        if name != "PLACEHOLDER_DO_NOT_REMOVE" {
            names.push(name);
        }
    }

    names
}

fn extract_schema_references(content: &str) -> Vec<String> {
    use std::collections::HashSet;

    let builtin_identifiers: HashSet<&str> = [
        "initTRPC",
        "z",
        "t",
        "publicProcedure",
        "appRouter",
        "AppRouter",
        "async",
        "any",
        "const",
        "import",
        "from",
        "export",
        "typeof",
    ]
    .iter()
    .copied()
    .collect();

    let mut schema_names = HashSet::new();

    for line in content.lines() {
        let is_import_line = line.starts_with("import {") && line.contains("} from");
        if is_import_line {
            let import_names = parse_import_names(line);
            let filtered = import_names
                .into_iter()
                .filter(|n| !builtin_identifiers.contains(n.as_str()));
            schema_names.extend(filtered);
        }

        let pattern_schemas = extract_pattern_schemas(line);
        let filtered = pattern_schemas
            .into_iter()
            .filter(|n| !builtin_identifiers.contains(n.as_str()));
        schema_names.extend(filtered);
    }

    let enum_references = extract_enum_like_references(content);
    let filtered = enum_references
        .into_iter()
        .filter(|n| !builtin_identifiers.contains(n.as_str()));
    schema_names.extend(filtered);

    schema_names.into_iter().collect()
}

fn extract_identifier(text: &str) -> Option<String> {
    let trimmed = text.trim();
    if trimmed.starts_with("z.") {
        return None;
    }

    let mut identifier = String::new();
    for character in trimmed.chars() {
        if character.is_alphanumeric() || character == '_' {
            identifier.push(character);
        } else {
            break;
        }
    }

    if identifier.is_empty() {
        None
    } else {
        Some(identifier)
    }
}

fn generate_and_validate_typescript(fixture_name: &str) {
    let fixture_path = fixtures_directory().join(fixture_name);

    let temporary_directory = TempDir::new().expect("Failed to create temp directory");
    let output_path = temporary_directory.path();

    run_generation(&fixture_path, output_path, "**/*.router.ts").expect("Generation failed");

    let server_file = output_path.join("server.ts");
    let generated_content = fs::read_to_string(&server_file).expect("Failed to read server.ts");

    create_stub_declarations(output_path, &generated_content);

    let nestjs_trpc_node_modules = nestjs_trpc_package();
    let tsconfig_content = build_tsconfig(&nestjs_trpc_node_modules);
    let tsconfig_path = temporary_directory.path().join("tsconfig.json");
    fs::write(&tsconfig_path, &tsconfig_content).expect("Failed to write tsconfig");

    let Some(tsc_binary) = find_tsc_binary() else {
        eprintln!(
            "Warning: tsc not found in workspace, skipping validation test for '{fixture_name}'"
        );
        return;
    };

    let tsc_result = Command::new(&tsc_binary)
        .args(["--noEmit", "--project", tsconfig_path.to_str().unwrap()])
        .output();

    match tsc_result {
        Ok(output) => {
            let stdout = String::from_utf8_lossy(&output.stdout);
            let stderr = String::from_utf8_lossy(&output.stderr);

            assert!(
                output.status.success(),
                "TypeScript validation failed for fixture '{fixture_name}':\nstdout: {stdout}\nstderr: {stderr}"
            );
        }
        Err(error) => {
            if error.kind() == std::io::ErrorKind::NotFound {
                eprintln!("Warning: tsc not found, skipping validation test for '{fixture_name}'");
                return;
            }
            panic!("Failed to run tsc: {error}");
        }
    }
}

#[test]
fn validate_simple_router_compiles() {
    generate_and_validate_typescript("valid/simple-router");
}

#[test]
fn validate_nested_routers_compile() {
    generate_and_validate_typescript("nested");
}

#[test]
fn validate_middleware_router_compiles() {
    generate_and_validate_typescript("middleware");
}

#[test]
fn validate_complex_router_compiles() {
    generate_and_validate_typescript("complex");
}

#[test]
fn validate_enum_literals_compile() {
    generate_and_validate_typescript("enum-literals");
}

#[test]
fn validate_external_imports_compile() {
    generate_and_validate_typescript("external-imports");
}

#[test]
fn validation_catches_type_errors() {
    let temporary_directory = TempDir::new().expect("Failed to create temp directory");
    let output_path = temporary_directory.path().join("broken.ts");

    let invalid_typescript = "const x: string = 123; // Type error: number assigned to string";
    fs::write(&output_path, invalid_typescript).expect("Failed to write broken.ts");

    let tsconfig_content = r#"{
        "compilerOptions": {
            "target": "ES2020",
            "module": "commonjs",
            "strict": true,
            "skipLibCheck": true,
            "noEmit": true
        },
        "include": ["broken.ts"]
    }"#;

    let tsconfig_path = temporary_directory.path().join("tsconfig.json");
    fs::write(&tsconfig_path, tsconfig_content).expect("Failed to write tsconfig");

    let Some(tsc_binary) = find_tsc_binary() else {
        eprintln!("Warning: tsc not found, skipping negative validation test");
        return;
    };

    let tsc_result = Command::new(&tsc_binary)
        .args(["--noEmit", "--project", tsconfig_path.to_str().unwrap()])
        .output();

    match tsc_result {
        Ok(output) => {
            assert!(
                !output.status.success(),
                "Expected tsc to fail on type error, but it succeeded"
            );
        }
        Err(error) => {
            if error.kind() == std::io::ErrorKind::NotFound {
                eprintln!("Warning: tsc not found, skipping negative validation test");
                return;
            }
            panic!("Failed to run tsc: {error}");
        }
    }
}
