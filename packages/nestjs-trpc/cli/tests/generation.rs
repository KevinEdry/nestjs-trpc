#![allow(clippy::unwrap_used, clippy::expect_used)]

use insta::assert_snapshot;
use nestjs_trpc::run_generation;
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

    run_generation(&fixture_path, output_path, "**/*.router.ts").expect("Generation failed");

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
