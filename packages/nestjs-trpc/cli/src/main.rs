mod cli;

use std::fs;
use std::process::ExitCode;

use anyhow::Result;
use clap::Parser;
use tracing::debug;
use tracing_subscriber::filter::LevelFilter;
use tracing_subscriber::EnvFilter;

use cli::{Cli, Commands};
use nestjs_trpc::{ParserError, SyntaxDiagnostic};

const EXIT_SUCCESS: u8 = 0;
const EXIT_RUNTIME_ERROR: u8 = 1;
const EXIT_USAGE_ERROR: u8 = 2;

fn setup_color_output() {
    if std::env::var("NO_COLOR").is_ok() {
        console::set_colors_enabled(false);
        console::set_colors_enabled_stderr(false);
    }
}

#[allow(clippy::expect_used)]
fn main() -> ExitCode {
    setup_color_output();

    let cli = match Cli::try_parse() {
        Ok(cli) => cli,
        Err(error) => {
            // SAFETY: If stderr is not writable, there is no way to report errors anyway - panic is the only option
            error.print().expect("Failed to print CLI error");
            let exit_code = if error.use_stderr() {
                EXIT_USAGE_ERROR
            } else {
                EXIT_SUCCESS
            };
            return ExitCode::from(exit_code);
        }
    };

    setup_logging(&cli);
    debug!(?cli, "Parsed CLI arguments");

    match run(&cli) {
        Ok(exit_code) => exit_code,
        Err(error) => {
            print_error(&error);
            ExitCode::from(EXIT_RUNTIME_ERROR)
        }
    }
}

fn print_error(error: &anyhow::Error) {
    if let Some(ParserError::SyntaxError {
        path,
        line,
        column,
        message,
    }) = error.downcast_ref::<ParserError>()
    {
        if let Ok(content) = fs::read_to_string(path) {
            let diagnostic = SyntaxDiagnostic::new(path, &content, *line, *column, message.clone());
            let report = miette::Report::new(diagnostic);
            eprintln!("{report:?}");
            return;
        }
    }

    let report = miette::Report::msg(format!("{error:#}"));
    eprintln!("{report:?}");
}

fn setup_logging(cli: &Cli) {
    let level = if cli.debug {
        LevelFilter::TRACE
    } else {
        match cli.verbose {
            0 => LevelFilter::WARN,
            1 => LevelFilter::INFO,
            2 => LevelFilter::DEBUG,
            _ => LevelFilter::TRACE,
        }
    };

    let filter = EnvFilter::builder()
        .with_default_directive(level.into())
        .from_env_lossy();

    tracing_subscriber::fmt()
        .with_env_filter(filter)
        .with_target(cli.debug)
        .with_file(cli.debug)
        .with_line_number(cli.debug)
        .init();

    if cli.debug {
        debug!("Debug mode enabled - full diagnostic output active");
    }
}

fn run(cli: &Cli) -> Result<ExitCode> {
    match &cli.command {
        Some(Commands::Generate {
            entrypoint,
            output,
            router_pattern,
            json,
            dry_run,
        }) => {
            return cli::run_generate(
                entrypoint.as_deref(),
                output.as_deref(),
                router_pattern.as_deref(),
                *dry_run,
                *json,
            );
        }
        Some(Commands::Watch {
            entrypoint,
            output,
            router_pattern,
        }) => {
            cli::run_watch(
                entrypoint.as_deref(),
                output.as_deref(),
                router_pattern.as_deref(),
                cli.verbose > 0,
            )?;
        }
        None => {
            tracing::info!("No command specified. Use --help for usage information.");
            println!("NestJS-tRPC CLI - Generate tRPC routers from decorated TypeScript classes.");
            println!();
            println!("Run 'nestjs-trpc --help' for usage information.");
            println!("Run 'nestjs-trpc generate' to generate the server.ts file.");
        }
    }

    Ok(ExitCode::from(EXIT_SUCCESS))
}
