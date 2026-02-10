use std::fs;
use std::path::PathBuf;
use std::process::ExitCode;

use anyhow::{Context, Result};
use console::style;
use tracing::info;

use nestjs_trpc::{
    compute_diff, discover_root_module, extract_trpc_options, find_tsc, resolve_transformer_import,
    run_tsc_validation, DiffResult, TransformerInfo, TsParser,
};

use super::output::{DiffSummary, DryRunOutput, ValidationError};
use super::{DEFAULT_OUTPUT_PATH, DEFAULT_ROUTER_PATTERN};

const MAX_ERRORS_DISPLAYED: usize = 10;
const EXIT_SUCCESS: u8 = 0;
const EXIT_VALIDATION_ERROR: u8 = 1;

pub fn run_generate(
    entrypoint_override: Option<&str>,
    output_override: Option<&str>,
    router_pattern_override: Option<&str>,
    dry_run: bool,
    json_output: bool,
) -> Result<ExitCode> {
    let current_directory = std::env::current_dir().context("Failed to get current directory")?;

    let root_module_path = if let Some(entrypoint) = entrypoint_override {
        let path = PathBuf::from(entrypoint);
        if path.is_absolute() {
            path
        } else {
            current_directory.join(path)
        }
    } else {
        discover_root_module(&current_directory).context(
            "Failed to discover TRPCModule. Use --entrypoint to specify the module path.",
        )?
    };

    info!(
        root_module = %root_module_path.display(),
        "Found root module"
    );

    let (output_path, router_pattern) =
        build_generation_config(output_override, router_pattern_override)?;

    let base_directory = root_module_path.parent().unwrap_or(&current_directory);

    let transformer = extract_transformer_from_module(&root_module_path);

    if dry_run {
        run_dry_run_generation(
            base_directory,
            &output_path,
            &router_pattern,
            json_output,
            transformer.as_ref(),
        )
    } else {
        run_normal_generation(
            base_directory,
            &output_path,
            &router_pattern,
            transformer.as_ref(),
        )
    }
}

fn extract_transformer_from_module(root_module_path: &std::path::Path) -> Option<TransformerInfo> {
    let parser = TsParser::new();
    let parsed = parser.parse_file(root_module_path).ok()?;
    let options = extract_trpc_options(&parsed)?;
    let transformer_identifier = options.transformer_identifier?;
    resolve_transformer_import(&parsed, &transformer_identifier)
}

fn run_normal_generation(
    base_directory: &std::path::Path,
    output_path: &std::path::Path,
    router_pattern: &str,
    transformer: Option<&TransformerInfo>,
) -> Result<ExitCode> {
    let generation_result =
        nestjs_trpc::run_generation(base_directory, output_path, router_pattern, transformer)?;

    print_summary(
        output_path,
        generation_result.router_count,
        generation_result.procedure_count,
    );
    Ok(ExitCode::from(EXIT_SUCCESS))
}

fn run_dry_run_generation(
    base_directory: &std::path::Path,
    output_path: &std::path::Path,
    router_pattern: &str,
    json_output: bool,
    transformer: Option<&TransformerInfo>,
) -> Result<ExitCode> {
    let temp_directory = tempfile::tempdir().context("Failed to create temporary directory")?;
    let temp_output_path = temp_directory.path().join("@generated");

    let generation_result = nestjs_trpc::run_generation(
        base_directory,
        &temp_output_path,
        router_pattern,
        transformer,
    )?;

    let generated_server_path = temp_output_path.join("server.ts");
    let generated_content =
        fs::read_to_string(&generated_server_path).context("Failed to read generated server.ts")?;

    let existing_server_path = if output_path
        .extension()
        .is_some_and(|extension| extension == "ts" || extension == "tsx")
    {
        output_path.to_path_buf()
    } else {
        output_path.join("server.ts")
    };
    let existing_content = fs::read_to_string(&existing_server_path).ok();

    let diff_result = compute_diff(existing_content.as_deref(), &generated_content, "server.ts");

    let tsc_result = run_tsc_validation_if_available(base_directory, &temp_output_path);

    let dry_run_output =
        build_dry_run_output(&generation_result, &diff_result, tsc_result.as_ref());

    let exit_code = if dry_run_output.success {
        EXIT_SUCCESS
    } else {
        EXIT_VALIDATION_ERROR
    };

    if json_output {
        println!("{}", dry_run_output.to_json());
    } else {
        print_dry_run_human_output(&dry_run_output, &diff_result);
    }

    Ok(ExitCode::from(exit_code))
}

fn run_tsc_validation_if_available(
    base_directory: &std::path::Path,
    temp_output_path: &std::path::Path,
) -> Option<nestjs_trpc::TscResult> {
    let tsc_binary = find_tsc(base_directory)?;

    let generated_tsconfig = temp_output_path.join("tsconfig.json");
    if !generated_tsconfig.exists() {
        return None;
    }

    info!(tsc = %tsc_binary.display(), "Running TypeScript validation");

    run_tsc_validation(base_directory, &generated_tsconfig).ok()
}

fn build_dry_run_output(
    generation_result: &nestjs_trpc::GenerationResult,
    diff_result: &DiffResult,
    tsc_result: Option<&nestjs_trpc::TscResult>,
) -> DryRunOutput {
    let validation_errors: Vec<ValidationError> = tsc_result
        .map(|result| {
            result
                .errors
                .iter()
                .map(|error| ValidationError {
                    file: error.file.clone(),
                    line: error.line,
                    column: error.column,
                    code: error.code.clone(),
                    message: error.message.clone(),
                    severity: format!("{:?}", error.severity).to_lowercase(),
                })
                .collect()
        })
        .unwrap_or_default();

    let has_validation_errors =
        !validation_errors.is_empty() && validation_errors.iter().any(|e| e.severity == "error");

    DryRunOutput {
        success: !has_validation_errors,
        router_count: generation_result.router_count,
        procedure_count: generation_result.procedure_count,
        diff: Some(DiffSummary {
            has_changes: diff_result.has_changes,
            files_changed: usize::from(diff_result.has_changes),
            lines_added: diff_result.lines_added,
            lines_removed: diff_result.lines_removed,
        }),
        validation_errors,
        parse_errors: vec![],
    }
}

fn print_dry_run_human_output(output: &DryRunOutput, diff_result: &DiffResult) {
    println!();

    if output.success {
        println!(
            "{} Dry run completed successfully",
            style("✓").green().bold()
        );
    } else {
        println!("{} Dry run found issues", style("✗").red().bold());
    }

    println!();
    println!("  Routers:    {}", output.router_count);
    println!("  Procedures: {}", output.procedure_count);
    println!();

    if let Some(diff_summary) = &output.diff {
        print_diff_summary(diff_summary, diff_result);
    }

    if !output.validation_errors.is_empty() {
        print_validation_errors(&output.validation_errors);
    }
}

fn print_diff_summary(summary: &DiffSummary, diff_result: &DiffResult) {
    if !summary.has_changes {
        println!("  {} No changes detected", style("•").dim());
        return;
    }

    println!(
        "  {} {} added, {} removed",
        style("Changes:").bold(),
        style(format!("+{}", summary.lines_added)).green(),
        style(format!("-{}", summary.lines_removed)).red()
    );
    println!();

    if !diff_result.unified_diff.is_empty() {
        print_colored_diff(&diff_result.unified_diff);
    }
}

fn print_colored_diff(unified_diff: &str) {
    for line in unified_diff.lines() {
        let styled_line = if line.starts_with('+') && !line.starts_with("+++") {
            style(line).green().to_string()
        } else if line.starts_with('-') && !line.starts_with("---") {
            style(line).red().to_string()
        } else if line.starts_with("@@") {
            style(line).cyan().to_string()
        } else {
            line.to_string()
        };
        println!("    {styled_line}");
    }
    println!();
}

fn print_validation_errors(errors: &[ValidationError]) {
    println!("  {} TypeScript Errors:", style("Validation").bold());
    println!();

    let errors_to_show = if errors.len() > MAX_ERRORS_DISPLAYED {
        &errors[..MAX_ERRORS_DISPLAYED]
    } else {
        errors
    };

    for error in errors_to_show {
        println!(
            "    {}:{}: {} {}",
            style(&error.file).cyan(),
            error.line,
            style(&error.code).yellow(),
            error.message
        );
    }

    if errors.len() > MAX_ERRORS_DISPLAYED {
        let remaining = errors.len() - MAX_ERRORS_DISPLAYED;
        println!();
        println!(
            "    {} ... and {} more error{}",
            style("").dim(),
            remaining,
            if remaining == 1 { "" } else { "s" }
        );
    }

    println!();
}

fn build_generation_config(
    output_override: Option<&str>,
    router_pattern_override: Option<&str>,
) -> Result<(PathBuf, String)> {
    let output_path = if let Some(output) = output_override {
        if PathBuf::from(output).is_absolute() {
            PathBuf::from(output)
        } else {
            std::env::current_dir()?.join(output)
        }
    } else {
        std::env::current_dir()?.join(DEFAULT_OUTPUT_PATH)
    };

    let router_pattern =
        router_pattern_override.map_or_else(|| DEFAULT_ROUTER_PATTERN.to_string(), String::from);

    Ok((output_path, router_pattern))
}

fn print_summary(output_path: &std::path::Path, router_count: usize, procedure_count: usize) {
    let server_path = if output_path
        .extension()
        .is_some_and(|extension| extension == "ts" || extension == "tsx")
    {
        output_path.to_path_buf()
    } else {
        output_path.join("server.ts")
    };

    println!("✓ Generated server.ts successfully!");
    println!();
    println!("  Output:     {}", server_path.display());
    println!("  Routers:    {router_count}");
    println!("  Procedures: {procedure_count}");
    println!();
}
