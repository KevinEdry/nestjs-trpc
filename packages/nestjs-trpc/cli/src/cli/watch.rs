use std::path::{Path, PathBuf};

use anyhow::{Context, Result};
use tracing::{debug, info};

use nestjs_trpc::{
    discover_root_module, extract_trpc_options, resolve_transformer_import, TsParser, WatchConfig,
    WatchSession,
};

use super::{DEFAULT_OUTPUT_PATH, DEFAULT_ROUTER_PATTERN};

pub fn run_watch(
    entrypoint_override: Option<&str>,
    output_override: Option<&str>,
    router_pattern_override: Option<&str>,
    verbose: bool,
) -> Result<()> {
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

    let output_path = resolve_output_path(output_override, &current_directory);

    let router_pattern =
        router_pattern_override.map_or_else(|| DEFAULT_ROUTER_PATTERN.to_string(), String::from);

    let base_directory = root_module_path.parent().unwrap_or(&current_directory);

    debug!(
        output_path = %output_path.display(),
        router_pattern = %router_pattern,
        base_directory = %base_directory.display(),
        "Using watch configuration"
    );

    let transformer = extract_transformer_from_watch_module(&root_module_path);

    let config = WatchConfig::new(router_pattern, output_path, base_directory.to_path_buf())
        .with_debounce_milliseconds(300)
        .with_verbose(verbose)
        .with_transformer(transformer);

    let session = WatchSession::new(config)?;
    session.run()
}

fn extract_transformer_from_watch_module(
    root_module_path: &Path,
) -> Option<nestjs_trpc::TransformerInfo> {
    let parser = TsParser::new();
    let parsed = parser.parse_file(root_module_path).ok()?;
    let options = extract_trpc_options(&parsed)?;
    let transformer_identifier = options.transformer_identifier?;
    resolve_transformer_import(&parsed, &transformer_identifier)
}

fn resolve_output_path(output_override: Option<&str>, current_directory: &Path) -> PathBuf {
    let Some(output) = output_override else {
        return current_directory.join(DEFAULT_OUTPUT_PATH);
    };

    let path = PathBuf::from(output);
    if path.is_absolute() {
        path
    } else {
        current_directory.join(output)
    }
}
