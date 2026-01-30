mod generate;
mod output;
mod watch;

pub use generate::run_generate;
pub use watch::run_watch;

use clap::{Parser, Subcommand};

pub const DEFAULT_ROUTER_PATTERN: &str = "**/*.router.ts";
pub const DEFAULT_OUTPUT_PATH: &str = "./@generated";

#[derive(Parser, Debug)]
#[command(name = "nestjs-trpc")]
#[command(author, version, about)]
#[command(long_about = "A CLI tool that generates tRPC router definitions from \
NestJS router classes decorated with @Router, @Query, and @Mutation.\n\n\
Configuration is automatically extracted from TRPCModule.forRoot() in your NestJS module.")]
#[command(after_help = "EXAMPLES:
    nestjs-trpc generate                    Generate router types
    nestjs-trpc generate --dry-run          Validate without writing files
    nestjs-trpc watch                       Watch mode for development

Learn more: https://nestjs-trpc.io")]
pub struct Cli {
    #[command(subcommand)]
    pub command: Option<Commands>,

    /// Increase verbosity (-v for info, -vv for debug, -vvv for trace)
    #[arg(short, long, action = clap::ArgAction::Count, global = true, help_heading = "Verbosity")]
    pub verbose: u8,

    /// Enable full debug output with file locations for bug reports
    #[arg(long, global = true, help_heading = "Verbosity")]
    pub debug: bool,
}

#[derive(Subcommand, Debug)]
pub enum Commands {
    /// Generate tRPC router types from decorated TypeScript classes
    #[command(after_help = "EXAMPLES:
    nestjs-trpc generate
    nestjs-trpc generate --entrypoint src/app.module.ts
    nestjs-trpc generate --dry-run --json")]
    Generate {
        /// Path to `NestJS` module entry point (auto-discovered if not specified)
        #[arg(short, long, value_name = "PATH", help_heading = "Input")]
        entrypoint: Option<String>,

        /// Glob pattern to find router files
        #[arg(short, long, value_name = "PATTERN", help_heading = "Input")]
        router_pattern: Option<String>,

        /// Output directory for generated files
        #[arg(short, long, value_name = "PATH", help_heading = "Output")]
        output: Option<String>,

        /// Output results as JSON (useful for tooling integration)
        #[arg(long, help_heading = "Output")]
        json: bool,

        /// Validate and show what would be generated without writing files
        #[arg(long, help_heading = "Validation")]
        dry_run: bool,
    },
    /// Watch for file changes and regenerate router types automatically
    #[command(after_help = "EXAMPLES:
    nestjs-trpc watch
    nestjs-trpc watch --entrypoint src/app.module.ts
    nestjs-trpc watch -v")]
    Watch {
        /// Path to `NestJS` module entry point (auto-discovered if not specified)
        #[arg(short, long, value_name = "PATH", help_heading = "Input")]
        entrypoint: Option<String>,

        /// Glob pattern to find router files
        #[arg(short, long, value_name = "PATTERN", help_heading = "Input")]
        router_pattern: Option<String>,

        /// Output directory for generated files
        #[arg(short, long, value_name = "PATH", help_heading = "Output")]
        output: Option<String>,
    },
}
