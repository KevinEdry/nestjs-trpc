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
fn help_shows_usage_information() {
    cli_command()
        .arg("--help")
        .assert()
        .success()
        .stdout(predicate::str::contains("tRPC router definitions"));
}

#[test]
fn version_shows_package_version() {
    cli_command()
        .arg("--version")
        .assert()
        .success()
        .stdout(predicate::str::contains(env!("CARGO_PKG_VERSION")));
}

#[test]
fn generate_with_valid_router_succeeds() {
    let output_directory = TempDir::new().unwrap();
    let fixture = fixtures_directory().join("valid/simple-router");

    cli_command()
        .arg("generate")
        .arg("--entrypoint")
        .arg(fixture.join("user.router.ts"))
        .arg("--output")
        .arg(output_directory.path())
        .assert()
        .success()
        .stdout(predicate::str::contains("Generated server.ts successfully"));

    assert!(
        output_directory.path().join("server.ts").exists(),
        "server.ts should be generated"
    );
}

#[test]
fn generate_with_nonexistent_entrypoint_fails() {
    cli_command()
        .arg("generate")
        .arg("--entrypoint")
        .arg("/nonexistent/path/router.ts")
        .assert()
        .failure()
        .code(1);
}

#[test]
fn invalid_flag_returns_exit_code_2() {
    cli_command()
        .arg("--nonexistent-flag")
        .assert()
        .failure()
        .code(2);
}

#[test]
fn verbose_flag_is_accepted() {
    cli_command().arg("-v").arg("--help").assert().success();
}

#[test]
fn debug_flag_is_accepted() {
    cli_command()
        .arg("--debug")
        .arg("--help")
        .assert()
        .success();
}

#[test]
fn no_command_shows_help_message() {
    cli_command()
        .assert()
        .success()
        .stdout(predicate::str::contains("nestjs-trpc"));
}

#[test]
fn generate_help_shows_subcommand_options() {
    cli_command()
        .arg("generate")
        .arg("--help")
        .assert()
        .success()
        .stdout(predicate::str::contains("--entrypoint"))
        .stdout(predicate::str::contains("--output"));
}

#[test]
fn multiple_verbose_flags_accepted() {
    cli_command().arg("-vvv").arg("--help").assert().success();
}
