use anyhow::Result;
use chrono::Local;
use console::style;
use indicatif::ProgressBar;

use crate::{ParserError, SyntaxDiagnostic};

const SPINNER_TICK_MILLISECONDS: u64 = 80;
const BRAILLE_SPINNER_FRAMES: [&str; 10] = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

/// Formats current time as [HH:MM:SS] timestamp with gray styling.
#[must_use]
pub fn format_timestamp() -> String {
    let timestamp = Local::now().format("[%H:%M:%S]").to_string();
    style(timestamp).dim().to_string()
}

/// Prints startup message when watch mode begins.
pub fn print_startup_message(file_count: usize, pattern: &str) {
    println!("{} Starting watch mode...", format_timestamp());
    println!(
        "{} Found {} files matching '{}'",
        format_timestamp(),
        file_count,
        pattern
    );
    println!(
        "{} Watching for file changes. Press Ctrl+C to stop.",
        format_timestamp()
    );
    println!();
}

/// Prints success message after generation completes.
pub fn print_success(router_count: usize, procedure_count: usize, duration_milliseconds: u64) {
    let checkmark = style("✓").green();
    println!(
        "{} {} Generated AppRouter ({} routers, {} procedures) in {}ms",
        format_timestamp(),
        checkmark,
        router_count,
        procedure_count,
        duration_milliseconds
    );
}

/// Prints error summary after generation fails.
pub fn print_error_summary(errors: &[ParserError], verbose: bool) {
    if errors.is_empty() {
        return;
    }

    print_parse_error(&errors[0]);
    print_additional_errors(&errors[1..], verbose);
}

fn print_additional_errors(errors: &[ParserError], verbose: bool) {
    if errors.is_empty() {
        return;
    }

    if verbose {
        for error in errors {
            print_parse_error(error);
        }
    } else {
        println!("  ... and {} more errors", errors.len());
    }
}

/// Prints a single parser error with context if available.
fn print_parse_error(error: &ParserError) {
    if let ParserError::SyntaxError {
        path,
        line,
        column,
        message,
    } = error
    {
        if let Ok(content) = std::fs::read_to_string(path) {
            let diagnostic = SyntaxDiagnostic::new(path, &content, *line, *column, message.clone());
            let report = miette::Report::new(diagnostic);
            eprintln!("{report:?}");
            return;
        }
    }

    eprintln!("Parse error: {error}");
}

/// Creates a spinner with braille animation for progress indication.
#[must_use]
#[allow(clippy::literal_string_with_formatting_args)] // Template uses indicatif syntax, not std::fmt
#[allow(clippy::expect_used)]
pub fn create_spinner() -> ProgressBar {
    let spinner = ProgressBar::new_spinner();
    spinner.set_style(
        indicatif::ProgressStyle::default_spinner()
            .tick_strings(&BRAILLE_SPINNER_FRAMES)
            // SAFETY: Template is a compile-time constant string - if it's invalid, it's a programmer error that should panic
            .template("{spinner} {msg}")
            .expect("Invalid spinner template"),
    );
    spinner.enable_steady_tick(std::time::Duration::from_millis(SPINNER_TICK_MILLISECONDS));
    spinner
}

/// Runs a regeneration function with a spinner.
pub fn regenerate_with_spinner<F, T>(regenerate_function: F) -> Result<T>
where
    F: FnOnce() -> Result<T>,
{
    let spinner = create_spinner();
    spinner.set_message("Regenerating...");

    let result = regenerate_function();

    spinner.finish_and_clear();
    result
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_format_timestamp_has_correct_format() {
        let timestamp = format_timestamp();
        assert!(timestamp.starts_with('['));
        assert!(timestamp.ends_with(']'));
        assert_eq!(timestamp.len(), 10);
    }

    #[test]
    fn test_print_error_summary_empty_list() {
        print_error_summary(&[], false);
        print_error_summary(&[], true);
    }

    #[test]
    fn test_create_spinner_returns_spinner() {
        let spinner = create_spinner();
        assert!(spinner.is_hidden());
    }
}
