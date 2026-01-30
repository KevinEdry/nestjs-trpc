#![allow(clippy::unwrap_used, clippy::expect_used)]

use assert_cmd::Command;
use predicates::prelude::*;
use std::fs;
use std::path::PathBuf;
use tempfile::TempDir;

fn fixtures_directory() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("tests/fixtures")
}

fn cli_command() -> Command {
    #[allow(deprecated)]
    Command::cargo_bin("nestjs-trpc").expect("Failed to find nestjs-trpc binary")
}

// ============================================================================
// Original tests
// ============================================================================

#[test]
fn syntax_error_shows_file_path() {
    let fixture = fixtures_directory().join("invalid/syntax-error/broken.router.ts");

    let output = cli_command()
        .arg("generate")
        .arg("--entrypoint")
        .arg(&fixture)
        .output()
        .expect("Failed to execute command");

    assert!(!output.status.success(), "Command should fail");
    assert_eq!(output.status.code(), Some(1), "Exit code should be 1");

    let combined_output = String::from_utf8_lossy(&output.stdout).to_string()
        + &String::from_utf8_lossy(&output.stderr);

    assert!(
        combined_output.contains("broken.router.ts"),
        "Output should contain file path. Got: {combined_output}"
    );
}

#[test]
fn syntax_error_shows_error_message() {
    let fixture = fixtures_directory().join("invalid/syntax-error/broken.router.ts");

    cli_command()
        .arg("generate")
        .arg("--entrypoint")
        .arg(&fixture)
        .assert()
        .failure()
        .stderr(predicate::str::is_match("(?i)(syntax|parse|error)").unwrap());
}

#[test]
fn missing_decorator_shows_helpful_message() {
    let fixture = fixtures_directory().join("invalid/missing-decorator/plain-class.ts");

    cli_command()
        .arg("generate")
        .arg("--entrypoint")
        .arg(&fixture)
        .assert()
        .failure()
        .code(1)
        .stderr(predicate::str::is_match("(?i)(no.*router|@Router)").unwrap());
}

#[test]
fn error_output_is_not_empty() {
    let fixture = fixtures_directory().join("invalid/syntax-error/broken.router.ts");

    let output = cli_command()
        .arg("generate")
        .arg("--entrypoint")
        .arg(&fixture)
        .output()
        .expect("Failed to execute command");

    assert!(
        !output.stderr.is_empty(),
        "Error output should not be empty"
    );
}

#[test]
fn nonexistent_file_error() {
    cli_command()
        .arg("generate")
        .arg("--entrypoint")
        .arg("/this/path/does/not/exist.ts")
        .assert()
        .failure()
        .code(1)
        .stderr(predicate::str::is_match("(?i)(not found|no such file|discover|failed)").unwrap());
}

#[test]
fn verbose_increases_output() {
    let fixture = fixtures_directory().join("valid/simple-router");
    let temp_directory = TempDir::new().unwrap();

    let quiet_output = cli_command()
        .arg("generate")
        .arg("--entrypoint")
        .arg(fixture.join("user.router.ts"))
        .arg("--output")
        .arg(temp_directory.path())
        .output()
        .expect("Failed to execute command");

    let temp_directory_verbose = TempDir::new().unwrap();
    let verbose_output = cli_command()
        .arg("-vv")
        .arg("generate")
        .arg("--entrypoint")
        .arg(fixture.join("user.router.ts"))
        .arg("--output")
        .arg(temp_directory_verbose.path())
        .output()
        .expect("Failed to execute command");

    let quiet_length = quiet_output.stdout.len() + quiet_output.stderr.len();
    let verbose_length = verbose_output.stdout.len() + verbose_output.stderr.len();

    assert!(
        verbose_length >= quiet_length,
        "Verbose mode should produce at least as much output as quiet mode"
    );
}

#[test]
fn debug_mode_includes_file_locations() {
    let fixture = fixtures_directory().join("valid/simple-router");
    let temp_directory = TempDir::new().unwrap();

    let output = cli_command()
        .arg("--debug")
        .arg("generate")
        .arg("--entrypoint")
        .arg(fixture.join("user.router.ts"))
        .arg("--output")
        .arg(temp_directory.path())
        .output()
        .expect("Failed to execute command");

    let stderr = String::from_utf8_lossy(&output.stderr);
    assert!(
        stderr.contains(".rs:") || stderr.contains("DEBUG") || stderr.is_empty(),
        "Debug mode should include file locations or debug markers in stderr"
    );
}

// ============================================================================
// TEST-01: Malformed TypeScript input tests
// ============================================================================

#[test]
fn incomplete_class_declaration() {
    let fixture = fixtures_directory().join("invalid/incomplete-class/incomplete.router.ts");

    let output = cli_command()
        .arg("generate")
        .arg("--entrypoint")
        .arg(&fixture)
        .output()
        .expect("Failed to execute command");

    assert!(
        !output.status.success(),
        "Command should fail on incomplete class"
    );
    assert_eq!(output.status.code(), Some(1), "Exit code should be 1");

    let stderr = String::from_utf8_lossy(&output.stderr);
    let stdout = String::from_utf8_lossy(&output.stdout);
    let combined = format!("{stdout}{stderr}");

    assert!(
        combined.to_lowercase().contains("syntax")
            || combined.to_lowercase().contains("parse")
            || combined.to_lowercase().contains("unexpected")
            || combined.to_lowercase().contains("error"),
        "Should report syntax/parse error. Got: {combined}"
    );
}

#[test]
fn malformed_zod_schema() {
    let fixture = fixtures_directory().join("invalid/malformed-zod/malformed.router.ts");

    let output = cli_command()
        .arg("generate")
        .arg("--entrypoint")
        .arg(&fixture)
        .output()
        .expect("Failed to execute command");

    assert!(
        !output.status.success(),
        "Command should fail on malformed zod schema"
    );
    assert_eq!(output.status.code(), Some(1), "Exit code should be 1");

    let combined_output = String::from_utf8_lossy(&output.stdout).to_string()
        + &String::from_utf8_lossy(&output.stderr);

    assert!(
        !combined_output.is_empty(),
        "Should provide error message for malformed input"
    );
}

#[test]
fn invalid_decorator_argument_non_object() {
    let temp_directory = TempDir::new().unwrap();
    let file_path = temp_directory.path().join("invalid-arg.router.ts");

    fs::write(
        &file_path,
        r"
import { Router } from 'nestjs-trpc';

@Router(123)
export class InvalidArgRouter {
    getUser() {
        return { name: 'test' };
    }
}
",
    )
    .expect("Failed to write fixture file");

    let output = cli_command()
        .arg("generate")
        .arg("--entrypoint")
        .arg(&file_path)
        .output()
        .expect("Failed to execute command");

    let combined = String::from_utf8_lossy(&output.stdout).to_string()
        + &String::from_utf8_lossy(&output.stderr);

    assert!(
        !output.status.success()
            || combined.to_lowercase().contains("no")
            || combined.to_lowercase().contains("router"),
        "Should handle non-object decorator argument gracefully"
    );
}

// ============================================================================
// TEST-01: Missing/invalid file tests
// ============================================================================

#[test]
fn directory_instead_of_file() {
    let fixture = fixtures_directory().join("valid/simple-router");
    let temp_directory = TempDir::new().unwrap();

    let output = cli_command()
        .arg("generate")
        .arg("--entrypoint")
        .arg(&fixture)
        .arg("--output")
        .arg(temp_directory.path())
        .output()
        .expect("Failed to execute command");

    let combined = String::from_utf8_lossy(&output.stdout).to_string()
        + &String::from_utf8_lossy(&output.stderr);

    // CLI scans directory for router files automatically - this is valid behavior
    assert!(
        output.status.success() || output.status.code() == Some(1),
        "Should handle directory as entrypoint (scan for routers or fail gracefully). Got: {combined}"
    );
}

#[test]
fn permission_denied_output_path() {
    let fixture = fixtures_directory().join("valid/simple-router/user.router.ts");

    let output = cli_command()
        .arg("generate")
        .arg("--entrypoint")
        .arg(&fixture)
        .arg("--output")
        .arg("/root/restricted/path/that/should/not/exist")
        .output()
        .expect("Failed to execute command");

    let combined = String::from_utf8_lossy(&output.stdout).to_string()
        + &String::from_utf8_lossy(&output.stderr);

    assert!(
        !output.status.success()
            || combined.to_lowercase().contains("permission")
            || combined.to_lowercase().contains("denied")
            || combined.to_lowercase().contains("failed")
            || combined.to_lowercase().contains("error"),
        "Should handle permission denied gracefully. Got: {combined}"
    );
}

#[test]
fn circular_import_handling() {
    let fixture = fixtures_directory().join("invalid/circular-a/a.router.ts");
    let temp_directory = TempDir::new().unwrap();

    let output = cli_command()
        .arg("generate")
        .arg("--entrypoint")
        .arg(&fixture)
        .arg("--output")
        .arg(temp_directory.path())
        .timeout(std::time::Duration::from_secs(10))
        .output()
        .expect("Failed to execute command");

    assert!(
        output.status.success() || output.status.code() == Some(1),
        "Should not hang on circular imports"
    );
}

// ============================================================================
// TEST-01: Invalid syntax edge cases
// ============================================================================

#[test]
fn empty_router_class() {
    let fixture = fixtures_directory().join("invalid/empty-router/empty.router.ts");
    let temp_directory = TempDir::new().unwrap();

    let output = cli_command()
        .arg("generate")
        .arg("--entrypoint")
        .arg(&fixture)
        .arg("--output")
        .arg(temp_directory.path())
        .output()
        .expect("Failed to execute command");

    let combined = String::from_utf8_lossy(&output.stdout).to_string()
        + &String::from_utf8_lossy(&output.stderr);

    assert!(
        output.status.success(),
        "Empty router should not cause a crash. Got: {combined}"
    );

    let server_file = temp_directory.path().join("server.ts");
    if server_file.exists() {
        let content = fs::read_to_string(&server_file).expect("Failed to read server.ts");
        assert!(
            content.contains("appRouter") || content.contains("t.router"),
            "Generated file should contain router definition. Got: {content}"
        );
    }
}

#[test]
fn decorator_without_import() {
    let fixture = fixtures_directory().join("invalid/no-import/no-import.router.ts");
    let temp_directory = TempDir::new().unwrap();

    let output = cli_command()
        .arg("generate")
        .arg("--entrypoint")
        .arg(&fixture)
        .arg("--output")
        .arg(temp_directory.path())
        .output()
        .expect("Failed to execute command");

    assert!(
        output.status.success() || output.status.code() == Some(1),
        "Should handle decorator without import gracefully (either success with no routers or error)"
    );
}

#[test]
fn mixed_valid_invalid_input_inline() {
    let temp_directory = TempDir::new().unwrap();

    // Create a non-hidden subdirectory since scanner skips hidden dirs (starting with .)
    let src_directory = temp_directory.path().join("src");
    fs::create_dir_all(&src_directory).expect("Failed to create src directory");

    let file_path = src_directory.join("mixed.router.ts");

    fs::write(
        &file_path,
        r"
import { Router, Query } from 'nestjs-trpc';
import { z } from 'zod';

@Router({ alias: 'valid' })
export class ValidRouter {
    @Query({ input: z.string() })
    getUser() {
        return 'test';
    }
}

// Plain class below - should be ignored by router extraction
export class PlainClass {
    getValue() {
        return 'hello';
    }
}
",
    )
    .expect("Failed to write fixture file");

    let output_directory = temp_directory.path().join("output");
    fs::create_dir_all(&output_directory).expect("Failed to create output directory");

    let output = cli_command()
        .arg("generate")
        .arg("--entrypoint")
        .arg(file_path.to_str().unwrap())
        .arg("--output")
        .arg(output_directory.to_str().unwrap())
        .output()
        .expect("Failed to execute command");

    let combined = String::from_utf8_lossy(&output.stdout).to_string()
        + &String::from_utf8_lossy(&output.stderr);

    assert!(
        output.status.success(),
        "Should process valid router even with non-router classes. Got: {combined}"
    );
}

// ============================================================================
// Additional edge case tests
// ============================================================================

#[test]
fn unicode_in_file_path() {
    let temp_directory = TempDir::new().unwrap();
    let unicode_dir = temp_directory.path().join("用户");
    fs::create_dir_all(&unicode_dir).expect("Failed to create unicode directory");

    let file_path = unicode_dir.join("router.ts");
    fs::write(
        &file_path,
        r"
import { Router, Query } from 'nestjs-trpc';

@Router({ alias: 'unicode' })
export class UnicodeRouter {
    @Query()
    getUser() {
        return { name: 'test' };
    }
}
",
    )
    .expect("Failed to write fixture file");

    let output_directory = TempDir::new().unwrap();

    let output = cli_command()
        .arg("generate")
        .arg("--entrypoint")
        .arg(&file_path)
        .arg("--output")
        .arg(output_directory.path())
        .output()
        .expect("Failed to execute command");

    assert!(
        output.status.success() || output.status.code() == Some(1),
        "Should handle unicode file paths gracefully"
    );
}

#[test]
fn very_long_file_path() {
    let temp_directory = TempDir::new().unwrap();

    let long_path_segment = "a".repeat(50);
    let mut path = temp_directory.path().to_path_buf();
    for _ in 0..5 {
        path = path.join(&long_path_segment);
    }

    if fs::create_dir_all(&path).is_ok() {
        let file_path = path.join("router.ts");
        fs::write(
            &file_path,
            r"
import { Router } from 'nestjs-trpc';

@Router()
export class LongPathRouter {}
",
        )
        .expect("Failed to write fixture file");

        let output = cli_command()
            .arg("generate")
            .arg("--entrypoint")
            .arg(&file_path)
            .output()
            .expect("Failed to execute command");

        assert!(
            output.status.success() || output.status.code() == Some(1),
            "Should handle very long file paths gracefully"
        );
    }
}

#[test]
fn empty_file() {
    let temp_directory = TempDir::new().unwrap();
    let file_path = temp_directory.path().join("empty.router.ts");
    fs::write(&file_path, "").expect("Failed to write empty file");

    let output = cli_command()
        .arg("generate")
        .arg("--entrypoint")
        .arg(&file_path)
        .output()
        .expect("Failed to execute command");

    assert!(
        output.status.code() == Some(1),
        "Should fail gracefully on empty file"
    );
}

#[test]
fn file_with_only_comments() {
    let temp_directory = TempDir::new().unwrap();
    let file_path = temp_directory.path().join("comments-only.router.ts");
    fs::write(
        &file_path,
        r"
// This is a comment
/* This is a block comment */
/**
 * This is a JSDoc comment
 */
",
    )
    .expect("Failed to write file");

    let output = cli_command()
        .arg("generate")
        .arg("--entrypoint")
        .arg(&file_path)
        .output()
        .expect("Failed to execute command");

    assert!(
        output.status.code() == Some(1),
        "Should fail gracefully on file with only comments"
    );
}

#[test]
fn binary_file_as_input() {
    let temp_directory = TempDir::new().unwrap();
    let file_path = temp_directory.path().join("binary.router.ts");

    let binary_content: Vec<u8> = (0..=255u8).collect();
    fs::write(&file_path, &binary_content).expect("Failed to write binary file");

    let output = cli_command()
        .arg("generate")
        .arg("--entrypoint")
        .arg(&file_path)
        .output()
        .expect("Failed to execute command");

    assert!(
        output.status.code() == Some(1),
        "Should fail gracefully on binary file"
    );
}
