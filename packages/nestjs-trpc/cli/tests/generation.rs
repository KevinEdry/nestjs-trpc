#![allow(clippy::unwrap_used, clippy::expect_used)]

use insta::assert_snapshot;
use nestjs_trpc::{
    extract_trpc_options, resolve_transformer_import, run_generation, TransformerInfo, TsParser,
};
use std::fs;
use std::path::PathBuf;
use tempfile::TempDir;

fn fixtures_directory() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("tests/fixtures")
}

fn run_generation_on_fixture(fixture_name: &str) -> String {
    let fixture_path = fixtures_directory().join(fixture_name);

    let temporary_directory = TempDir::new().expect("Failed to create temp directory");
    let output_path = temporary_directory.path();

    run_generation(&fixture_path, output_path, "**/*.router.ts", None).expect("Generation failed");

    let server_file = output_path.join("server.ts");
    let content = fs::read_to_string(&server_file).expect("Failed to read generated server.ts");

    // Normalize absolute paths to make snapshots portable across machines
    normalize_paths(&content)
}

fn normalize_paths(content: &str) -> String {
    use regex::Regex;

    let fixtures_dir = fixtures_directory()
        .canonicalize()
        .expect("Failed to canonicalize fixtures directory");
    let fixtures_str = fixtures_dir.to_string_lossy();

    // Replace absolute fixture paths with a placeholder
    let content = content.replace(&*fixtures_str, "<FIXTURES>");

    // Strip the relative path prefix (../../../..) before <FIXTURES> to make snapshots
    // portable across platforms with different temp directory depths
    let relative_path_pattern = Regex::new(r"(\.\./?)+<FIXTURES>").expect("Invalid regex pattern");
    relative_path_pattern
        .replace_all(&content, "<FIXTURES>")
        .to_string()
}

#[test]
fn snapshot_simple_router() {
    let output = run_generation_on_fixture("valid/simple-router");
    assert_snapshot!("simple_router", output);
}

#[test]
fn snapshot_nested_routers() {
    let output = run_generation_on_fixture("nested");
    assert_snapshot!("nested_routers", output);
}

#[test]
fn snapshot_middleware_router() {
    let output = run_generation_on_fixture("middleware");
    assert_snapshot!("middleware_router", output);
}

#[test]
fn snapshot_complex_router() {
    let output = run_generation_on_fixture("complex");
    assert_snapshot!("complex_router", output);
}

#[test]
fn snapshot_enum_literals() {
    let output = run_generation_on_fixture("enum-literals");
    assert_snapshot!("enum_literals", output);
}

#[test]
fn snapshot_subscription() {
    let output = run_generation_on_fixture("subscription");
    assert_snapshot!("subscription", output);
}

#[test]
fn snapshot_path_aliases() {
    let output = run_generation_on_fixture("path-aliases");
    assert_snapshot!("path_aliases", output);
}

#[test]
fn snapshot_external_imports() {
    let output = run_generation_on_fixture("external-imports");
    assert_snapshot!("external_imports", output);
}

#[test]
fn snapshot_merged_alias() {
    let output = run_generation_on_fixture("merged-alias");
    assert_snapshot!("merged_alias", output);
}

#[test]
fn snapshot_with_default_transformer() {
    let fixture_path = fixtures_directory().join("valid/simple-router");

    let temporary_directory = TempDir::new().expect("Failed to create temp directory");
    let output_path = temporary_directory.path();

    let transformer = TransformerInfo {
        package_name: "superjson".to_string(),
        import_name: "superjson".to_string(),
        is_default_import: true,
    };

    run_generation(
        &fixture_path,
        output_path,
        "**/*.router.ts",
        Some(&transformer),
    )
    .expect("Generation failed");

    let server_file = output_path.join("server.ts");
    let content = fs::read_to_string(&server_file).expect("Failed to read generated server.ts");
    let normalized = normalize_paths(&content);

    assert_snapshot!("with_default_transformer", normalized);
}

#[test]
fn snapshot_with_named_transformer() {
    let fixture_path = fixtures_directory().join("valid/simple-router");

    let temporary_directory = TempDir::new().expect("Failed to create temp directory");
    let output_path = temporary_directory.path();

    let transformer = TransformerInfo {
        package_name: "custom-transformer".to_string(),
        import_name: "myTransformer".to_string(),
        is_default_import: false,
    };

    run_generation(
        &fixture_path,
        output_path,
        "**/*.router.ts",
        Some(&transformer),
    )
    .expect("Generation failed");

    let server_file = output_path.join("server.ts");
    let content = fs::read_to_string(&server_file).expect("Failed to read generated server.ts");
    let normalized = normalize_paths(&content);

    assert_snapshot!("with_named_transformer", normalized);
}

// ========================================================================
// Full pipeline e2e: module parsing -> transformer extraction -> generation
// ========================================================================

fn extract_transformer_from_fixture_module(fixture_name: &str) -> Option<TransformerInfo> {
    let module_path = fixtures_directory()
        .join(fixture_name)
        .join("app.module.ts");
    let parser = TsParser::new();
    let parsed = parser.parse_file(&module_path).ok()?;
    let options = extract_trpc_options(&parsed)?;
    let identifier = options.transformer_identifier?;
    resolve_transformer_import(&parsed, &identifier)
}

fn run_generation_with_module_transformer(fixture_name: &str) -> String {
    let fixture_path = fixtures_directory().join(fixture_name);
    let temporary_directory = TempDir::new().expect("Failed to create temp directory");
    let output_path = temporary_directory.path();

    let transformer = extract_transformer_from_fixture_module(fixture_name);

    run_generation(
        &fixture_path,
        output_path,
        "**/*.router.ts",
        transformer.as_ref(),
    )
    .expect("Generation failed");

    let server_file = output_path.join("server.ts");
    let content = fs::read_to_string(&server_file).expect("Failed to read generated server.ts");
    normalize_paths(&content)
}

#[test]
fn snapshot_transformer_from_library() {
    let output = run_generation_with_module_transformer("transformer-library");
    assert_snapshot!("transformer_from_library", output);
}

#[test]
fn snapshot_transformer_from_local_file() {
    let output = run_generation_with_module_transformer("transformer-local");
    assert_snapshot!("transformer_from_local_file", output);
}

#[test]
fn transformer_extraction_from_library_module() {
    let transformer = extract_transformer_from_fixture_module("transformer-library");
    assert!(transformer.is_some(), "Should resolve library transformer");

    let info = transformer.unwrap();
    assert_eq!(info.package_name, "superjson");
    assert_eq!(info.import_name, "superjson");
    assert!(info.is_default_import);
}

#[test]
fn transformer_extraction_from_local_module() {
    let transformer = extract_transformer_from_fixture_module("transformer-local");
    assert!(transformer.is_some(), "Should resolve local transformer");

    let info = transformer.unwrap();
    assert_eq!(info.package_name, "./my-transformer");
    assert_eq!(info.import_name, "customTransformer");
    assert!(!info.is_default_import);
}

#[test]
fn inline_transformer_not_importable_falls_back_to_none() {
    let temp_directory = TempDir::new().expect("Failed to create temp directory");
    let module_path = temp_directory.path().join("app.module.ts");

    fs::write(
        &module_path,
        r"
        import { Module } from '@nestjs/common';
        import { TRPCModule } from 'nestjs-trpc';

        const inlineTransformer = {
            serialize: (v: any) => JSON.stringify(v),
            deserialize: (v: string) => JSON.parse(v),
        };

        @Module({
            imports: [
                TRPCModule.forRoot({
                    autoSchemaFile: './src/@generated',
                    transformer: inlineTransformer,
                }),
            ],
        })
        export class AppModule {}
    ",
    )
    .unwrap();

    let parser = TsParser::new();
    let parsed = parser.parse_file(&module_path).expect("Failed to parse");
    let options = extract_trpc_options(&parsed).expect("Should extract options");

    assert_eq!(
        options.transformer_identifier,
        Some("inlineTransformer".to_string()),
        "Should extract the identifier even if not imported"
    );

    let transformer = resolve_transformer_import(&parsed, "inlineTransformer");
    assert!(
        transformer.is_none(),
        "In-file transformer has no import declaration, should return None"
    );
}

#[test]
fn generation_without_transformer_has_plain_create() {
    let output = run_generation_on_fixture("valid/simple-router");
    assert!(
        output.contains("const t = initTRPC.create();"),
        "Without transformer, should use plain initTRPC.create()"
    );
    assert!(
        !output.contains("transformer"),
        "Without transformer, output should not mention 'transformer'"
    );
}
