pub mod event_loop;
pub mod paths;
pub mod progress;

use anyhow::Result;
use console::Term;
use std::path::PathBuf;

use crate::parser::module::TransformerInfo;

pub use event_loop::*;
pub use paths::{find_watchable_files, should_watch_path};
pub use progress::*;

const DEFAULT_DEBOUNCE_MILLISECONDS: u64 = 300;

/// Configuration for watch mode.
#[derive(Debug, Clone)]
pub struct WatchConfig {
    /// Glob pattern for finding router files
    pub router_pattern: String,

    /// Output directory where generated files are written (excluded from watch)
    pub output_directory: PathBuf,

    /// Base directory to watch for file changes
    pub base_directory: PathBuf,

    /// Debounce duration in milliseconds before triggering regeneration
    pub debounce_milliseconds: u64,

    /// Enable verbose logging
    pub verbose: bool,

    /// Transformer info extracted from `TRPCModule.forRoot()`
    pub transformer: Option<TransformerInfo>,
}

impl WatchConfig {
    /// Creates a new watch configuration.
    #[must_use]
    pub const fn new(
        router_pattern: String,
        output_directory: PathBuf,
        base_directory: PathBuf,
    ) -> Self {
        Self {
            router_pattern,
            output_directory,
            base_directory,
            debounce_milliseconds: DEFAULT_DEBOUNCE_MILLISECONDS,
            verbose: false,
            transformer: None,
        }
    }

    /// Sets the transformer info.
    #[must_use]
    pub fn with_transformer(mut self, transformer: Option<TransformerInfo>) -> Self {
        self.transformer = transformer;
        self
    }

    /// Sets the debounce duration in milliseconds.
    #[must_use]
    pub const fn with_debounce_milliseconds(mut self, milliseconds: u64) -> Self {
        self.debounce_milliseconds = milliseconds;
        self
    }

    /// Enables verbose logging.
    #[must_use]
    pub const fn with_verbose(mut self, verbose: bool) -> Self {
        self.verbose = verbose;
        self
    }
}

/// A watch session that monitors files and triggers regeneration on changes.
pub struct WatchSession {
    config: WatchConfig,
    terminal: Term,
}

impl WatchSession {
    /// Creates a new watch session with the given configuration.
    pub fn new(config: WatchConfig) -> Result<Self> {
        let terminal = Term::stdout();
        Ok(Self { config, terminal })
    }

    /// Runs the watch session, monitoring files for changes.
    pub fn run(&self) -> Result<()> {
        use anyhow::Context;
        use crossbeam_channel::bounded;
        use notify::RecursiveMode;

        let watchable_files = find_watchable_files(
            &self.config.base_directory,
            &self.config.router_pattern,
            &self.config.output_directory,
        )?;

        if watchable_files.is_empty() {
            anyhow::bail!(
                "No files found matching pattern '{}' in '{}'. \
                Watch mode requires at least one file to monitor.",
                self.config.router_pattern,
                self.config.base_directory.display()
            );
        }

        self.terminal.clear_screen()?;
        print_startup_message(watchable_files.len(), &self.config.router_pattern);

        let generation_result = self.run_initial_generation();
        self.print_generation_result(&generation_result);

        let (file_event_sender, file_event_receiver) = bounded(100);
        let shutdown_receiver = setup_shutdown_handler()?;

        let mut watcher =
            create_file_watcher(file_event_sender, self.config.debounce_milliseconds)?;

        watcher
            .watcher()
            .watch(&self.config.base_directory, RecursiveMode::Recursive)
            .context("Failed to start watching directory")?;

        let config_clone = self.config.clone();

        run_event_loop(
            file_event_receiver,
            shutdown_receiver,
            &self.config.output_directory,
            move |_changed_paths| handle_file_change(&config_clone),
        )?;

        Ok(())
    }

    fn run_initial_generation(&self) -> Result<crate::GenerationResult> {
        crate::run_generation(
            &self.config.base_directory,
            &self.config.output_directory,
            &self.config.router_pattern,
            self.config.transformer.as_ref(),
        )
    }

    #[allow(clippy::unused_self)]
    fn print_generation_result(&self, result: &Result<crate::GenerationResult>) {
        match result {
            Ok(generation_result) => {
                print_success(
                    generation_result.router_count,
                    generation_result.procedure_count,
                    generation_result.duration_milliseconds,
                );
            }
            Err(error) => {
                eprintln!("Initial generation failed: {error}");
            }
        }
    }

    #[must_use]
    pub const fn config(&self) -> &WatchConfig {
        &self.config
    }

    #[must_use]
    pub const fn terminal(&self) -> &Term {
        &self.terminal
    }
}

#[allow(clippy::unnecessary_wraps)]
fn handle_file_change(config: &WatchConfig) -> Result<()> {
    let generation_result = regenerate_with_spinner(|| {
        crate::run_generation(
            &config.base_directory,
            &config.output_directory,
            &config.router_pattern,
            config.transformer.as_ref(),
        )
    });

    match generation_result {
        Ok(result) => print_success(
            result.router_count,
            result.procedure_count,
            result.duration_milliseconds,
        ),
        Err(error) => eprintln!("Generation failed: {error}"),
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_watch_config_creation() {
        let config = WatchConfig::new(
            "**/*.router.ts".to_string(),
            PathBuf::from("/output"),
            PathBuf::from("/base"),
        );

        assert_eq!(config.router_pattern, "**/*.router.ts");
        assert_eq!(config.output_directory, PathBuf::from("/output"));
        assert_eq!(config.base_directory, PathBuf::from("/base"));
        assert_eq!(config.debounce_milliseconds, DEFAULT_DEBOUNCE_MILLISECONDS);
        assert!(!config.verbose);
    }

    #[test]
    fn test_watch_config_with_debounce() {
        let config = WatchConfig::new(
            "**/*.router.ts".to_string(),
            PathBuf::from("/output"),
            PathBuf::from("/base"),
        )
        .with_debounce_milliseconds(500);

        assert_eq!(config.debounce_milliseconds, 500);
    }

    #[test]
    fn test_watch_config_with_verbose() {
        let config = WatchConfig::new(
            "**/*.router.ts".to_string(),
            PathBuf::from("/output"),
            PathBuf::from("/base"),
        )
        .with_verbose(true);

        assert!(config.verbose);
    }

    #[test]
    fn test_watch_session_creation() {
        let config = WatchConfig::new(
            "**/*.router.ts".to_string(),
            PathBuf::from("/output"),
            PathBuf::from("/base"),
        );

        let session = WatchSession::new(config);
        assert!(session.is_ok());
    }

    #[test]
    fn test_watch_session_initial_generation() {
        let temp_dir = tempfile::TempDir::new().unwrap();

        // Create a valid router file for testing
        let router_content = r"
            import { Router, Query } from 'nestjs-trpc';
            import { z } from 'zod';

            @Router()
            export class TestRouter {
                @Query({ input: z.string() })
                hello() { return 'world'; }
            }
        ";
        std::fs::write(temp_dir.path().join("test.router.ts"), router_content).unwrap();

        let config = WatchConfig::new(
            "**/*.router.ts".to_string(),
            temp_dir.path().join("output"),
            temp_dir.path().to_path_buf(),
        );

        let session = WatchSession::new(config).unwrap();

        // Test initial generation works
        let result = session.run_initial_generation();
        assert!(result.is_ok());
    }

    #[test]
    fn test_watch_session_accessors() {
        let config = WatchConfig::new(
            "**/*.router.ts".to_string(),
            PathBuf::from("/output"),
            PathBuf::from("/base"),
        );

        let session = WatchSession::new(config.clone()).unwrap();
        assert_eq!(session.config().router_pattern, config.router_pattern);
    }
}
