use std::io::{BufRead, BufReader};
use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};
use std::time::Duration;

use anyhow::{bail, Context, Result};
use serde::Serialize;

const TSC_TIMEOUT: Duration = Duration::from_secs(30);

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TscResult {
    pub success: bool,
    pub errors: Vec<TscError>,
    pub error_count: usize,
    pub warning_count: usize,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TscError {
    pub file: String,
    pub line: usize,
    pub column: usize,
    pub code: String,
    pub message: String,
    pub severity: TscSeverity,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum TscSeverity {
    Error,
    Warning,
}

#[must_use]
pub fn find_tsc(base_directory: &Path) -> Option<PathBuf> {
    let search_paths = [
        base_directory.join("node_modules/.bin/tsc"),
        base_directory.join("../node_modules/.bin/tsc"),
        base_directory.join("../../node_modules/.bin/tsc"),
        base_directory.join("../../../node_modules/.bin/tsc"),
    ];

    for path in &search_paths {
        if path.exists() {
            return Some(path.clone());
        }
    }

    find_tsc_in_path()
}

fn find_tsc_in_path() -> Option<PathBuf> {
    let path_var = std::env::var("PATH").ok()?;
    let separator = if cfg!(windows) { ';' } else { ':' };

    for directory in path_var.split(separator) {
        let tsc_path = Path::new(directory).join("tsc");
        if tsc_path.exists() {
            return Some(tsc_path);
        }

        #[cfg(windows)]
        {
            let tsc_cmd = Path::new(directory).join("tsc.cmd");
            if tsc_cmd.exists() {
                return Some(tsc_cmd);
            }
        }
    }

    None
}

#[allow(clippy::expect_used)]
pub fn run_tsc_validation(project_directory: &Path, tsconfig_path: &Path) -> Result<TscResult> {
    let tsc_binary = find_tsc(project_directory).ok_or_else(|| {
        anyhow::anyhow!(
            "TypeScript compiler (tsc) not found.\n\
             Please ensure TypeScript is installed:\n  \
             npm install -D typescript\n\
             or\n  \
             bun add -D typescript"
        )
    })?;

    let mut child = Command::new(&tsc_binary)
        .args(["--noEmit", "--pretty", "false", "--project"])
        .arg(tsconfig_path)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .with_context(|| format!("Failed to execute tsc at {}", tsc_binary.display()))?;

    // SAFETY: stdout is guaranteed to be Some when Command is configured with Stdio::piped()
    let stdout = child.stdout.take().expect("stdout should be captured");
    // SAFETY: stderr is guaranteed to be Some when Command is configured with Stdio::piped()
    let stderr = child.stderr.take().expect("stderr should be captured");

    let stdout_reader = BufReader::new(stdout);
    let stderr_reader = BufReader::new(stderr);

    let mut errors = Vec::new();

    for line in stdout_reader.lines().chain(stderr_reader.lines()) {
        let line = line.context("Failed to read tsc output")?;
        if let Some(error) = parse_tsc_error_line(&line) {
            errors.push(error);
        }
    }

    let status = wait_with_timeout(&mut child, TSC_TIMEOUT)?;

    let error_count = errors
        .iter()
        .filter(|e| e.severity == TscSeverity::Error)
        .count();
    let warning_count = errors
        .iter()
        .filter(|e| e.severity == TscSeverity::Warning)
        .count();

    Ok(TscResult {
        success: status.success() && error_count == 0,
        errors,
        error_count,
        warning_count,
    })
}

fn wait_with_timeout(
    child: &mut std::process::Child,
    timeout: Duration,
) -> Result<std::process::ExitStatus> {
    let start = std::time::Instant::now();

    loop {
        match child.try_wait() {
            Ok(Some(status)) => return Ok(status),
            Ok(None) => wait_or_timeout(child, start, timeout)?,
            Err(error) => bail!("Failed to wait for tsc process: {error}"),
        }
    }
}

fn wait_or_timeout(
    child: &mut std::process::Child,
    start: std::time::Instant,
    timeout: Duration,
) -> Result<()> {
    let timed_out = start.elapsed() > timeout;
    if timed_out {
        let _ = child.kill();
        bail!(
            "TypeScript compilation timed out after {} seconds",
            timeout.as_secs()
        );
    }
    std::thread::sleep(Duration::from_millis(50));
    Ok(())
}

fn parse_tsc_error_line(line: &str) -> Option<TscError> {
    let trimmed = line.trim();
    if trimmed.is_empty() {
        return None;
    }

    let (file_location, rest) = trimmed.split_once(": ")?;

    let (severity, after_severity) = if rest.starts_with("error TS") {
        (TscSeverity::Error, &rest[6..])
    } else if rest.starts_with("warning TS") {
        (TscSeverity::Warning, &rest[8..])
    } else {
        return None;
    };

    let (code, message) = after_severity.split_once(": ")?;

    let (file, line_col) = parse_file_location(file_location)?;
    let (line_number, column) = parse_line_column(line_col)?;

    Some(TscError {
        file: file.to_string(),
        line: line_number,
        column,
        code: code.trim().to_string(),
        message: message.to_string(),
        severity,
    })
}

fn parse_file_location(location: &str) -> Option<(&str, &str)> {
    let open_paren = location.rfind('(')?;
    let close_paren = location.rfind(')')?;

    if open_paren >= close_paren {
        return None;
    }

    let file = &location[..open_paren];
    let line_col = &location[open_paren + 1..close_paren];

    Some((file, line_col))
}

fn parse_line_column(line_col: &str) -> Option<(usize, usize)> {
    let (line_str, col_str) = line_col.split_once(',')?;
    let line_number = line_str.trim().parse().ok()?;
    let column = col_str.trim().parse().ok()?;
    Some((line_number, column))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_error_line_correctly() {
        let line =
            "src/app.ts(10,5): error TS2322: Type 'number' is not assignable to type 'string'.";
        let error = parse_tsc_error_line(line).unwrap();

        assert_eq!(error.file, "src/app.ts");
        assert_eq!(error.line, 10);
        assert_eq!(error.column, 5);
        assert_eq!(error.code, "TS2322");
        assert_eq!(
            error.message,
            "Type 'number' is not assignable to type 'string'."
        );
        assert_eq!(error.severity, TscSeverity::Error);
    }

    #[test]
    fn parses_warning_line_correctly() {
        let line =
            "src/utils.ts(3,1): warning TS6133: 'unused' is declared but its value is never read.";
        let error = parse_tsc_error_line(line).unwrap();

        assert_eq!(error.file, "src/utils.ts");
        assert_eq!(error.line, 3);
        assert_eq!(error.column, 1);
        assert_eq!(error.code, "TS6133");
        assert_eq!(error.severity, TscSeverity::Warning);
    }

    #[test]
    fn returns_none_for_empty_line() {
        assert!(parse_tsc_error_line("").is_none());
        assert!(parse_tsc_error_line("   ").is_none());
    }

    #[test]
    fn returns_none_for_non_error_line() {
        assert!(parse_tsc_error_line("Compilation complete.").is_none());
        assert!(parse_tsc_error_line("Found 3 errors.").is_none());
    }

    #[test]
    fn handles_windows_paths() {
        let line = "C:\\Users\\dev\\src\\app.ts(5,10): error TS1005: ';' expected.";
        let error = parse_tsc_error_line(line).unwrap();

        assert_eq!(error.file, "C:\\Users\\dev\\src\\app.ts");
        assert_eq!(error.line, 5);
        assert_eq!(error.column, 10);
    }
}
