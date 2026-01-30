#![allow(clippy::unwrap_used, clippy::expect_used)]

use assert_cmd::Command;
use predicates::prelude::*;
use std::path::PathBuf;
use tempfile::TempDir;

fn fixtures_directory() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("tests/fixtures")
}

fn cli_command() -> Command {
    #[allow(deprecated)]
    Command::cargo_bin("nestjs-trpc").expect("Failed to find nestjs-trpc binary")
}

#[test]
fn dry_run_validates_without_writing_files() {
    let fixture = fixtures_directory().join("valid/simple-router");
    let output_directory = TempDir::new().unwrap();
    let output_path = output_directory.path().join("@generated");

    cli_command()
        .arg("generate")
        .arg("--entrypoint")
        .arg(fixture.join("user.router.ts"))
        .arg("--output")
        .arg(&output_path)
        .arg("--dry-run")
        .assert()
        .success();

    assert!(
        !output_path.exists(),
        "Dry-run should not create output directory"
    );
}

#[test]
fn dry_run_json_output_is_valid_json() {
    let fixture = fixtures_directory().join("valid/simple-router");

    let output = cli_command()
        .arg("generate")
        .arg("--entrypoint")
        .arg(fixture.join("user.router.ts"))
        .arg("--dry-run")
        .arg("--json")
        .output()
        .expect("Failed to execute command");

    let stdout = String::from_utf8_lossy(&output.stdout);

    let parsed: serde_json::Value =
        serde_json::from_str(&stdout).expect("--json output should be valid JSON");

    assert!(
        parsed.get("success").is_some(),
        "JSON should have 'success' field"
    );
    assert!(
        parsed.get("routerCount").is_some(),
        "JSON should have 'routerCount' field"
    );
    assert!(
        parsed.get("procedureCount").is_some(),
        "JSON should have 'procedureCount' field"
    );
}

#[test]
fn dry_run_json_output_contains_diff_info() {
    let fixture = fixtures_directory().join("valid/simple-router");

    let output = cli_command()
        .arg("generate")
        .arg("--entrypoint")
        .arg(fixture.join("user.router.ts"))
        .arg("--dry-run")
        .arg("--json")
        .output()
        .expect("Failed to execute command");

    let stdout = String::from_utf8_lossy(&output.stdout);

    let parsed: serde_json::Value =
        serde_json::from_str(&stdout).expect("--json output should be valid JSON");

    let diff = parsed.get("diff").expect("JSON should have 'diff' field");

    assert!(
        diff.get("hasChanges").is_some(),
        "diff should have 'hasChanges' field"
    );
    assert!(
        diff.get("linesAdded").is_some(),
        "diff should have 'linesAdded' field"
    );
    assert!(
        diff.get("linesRemoved").is_some(),
        "diff should have 'linesRemoved' field"
    );
}

#[test]
fn dry_run_shows_success_indicator() {
    let fixture = fixtures_directory().join("valid/simple-router");

    cli_command()
        .arg("generate")
        .arg("--entrypoint")
        .arg(fixture.join("user.router.ts"))
        .arg("--dry-run")
        .assert()
        .success()
        .stdout(predicate::str::contains("Dry run"));
}

#[test]
fn dry_run_shows_router_and_procedure_counts() {
    let fixture = fixtures_directory().join("valid/simple-router");

    cli_command()
        .arg("generate")
        .arg("--entrypoint")
        .arg(fixture.join("user.router.ts"))
        .arg("--dry-run")
        .assert()
        .success()
        .stdout(predicate::str::contains("Routers:"))
        .stdout(predicate::str::contains("Procedures:"));
}

#[test]
fn dry_run_shows_changes_indicator_for_new_files() {
    let fixture = fixtures_directory().join("valid/simple-router");
    let output_directory = TempDir::new().unwrap();

    cli_command()
        .arg("generate")
        .arg("--entrypoint")
        .arg(fixture.join("user.router.ts"))
        .arg("--output")
        .arg(output_directory.path())
        .arg("--dry-run")
        .assert()
        .success()
        .stdout(predicate::str::contains("added"));
}

#[test]
fn dry_run_exit_code_zero_on_success() {
    let fixture = fixtures_directory().join("valid/simple-router");

    cli_command()
        .arg("generate")
        .arg("--entrypoint")
        .arg(fixture.join("user.router.ts"))
        .arg("--dry-run")
        .assert()
        .code(0);
}

#[test]
fn dry_run_json_reports_success_true_for_valid_input() {
    let fixture = fixtures_directory().join("valid/simple-router");

    let output = cli_command()
        .arg("generate")
        .arg("--entrypoint")
        .arg(fixture.join("user.router.ts"))
        .arg("--dry-run")
        .arg("--json")
        .output()
        .expect("Failed to execute command");

    let stdout = String::from_utf8_lossy(&output.stdout);
    let parsed: serde_json::Value =
        serde_json::from_str(&stdout).expect("--json output should be valid JSON");

    assert_eq!(
        parsed.get("success").and_then(serde_json::Value::as_bool),
        Some(true),
        "success should be true for valid input"
    );
}
