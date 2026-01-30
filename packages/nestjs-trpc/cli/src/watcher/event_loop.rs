use std::path::{Path, PathBuf};
use std::time::Duration;

use anyhow::{Context, Result};
use crossbeam_channel::{bounded, select, Receiver, Sender};
use notify_debouncer_mini::{
    new_debouncer, DebounceEventResult, DebouncedEvent, DebouncedEventKind, Debouncer,
};

use super::paths::should_watch_path;

/// Event types for the watch loop.
pub enum WatchEvent {
    /// File change event with list of affected paths
    FileChanged(Vec<PathBuf>),
    /// Shutdown signal received
    Shutdown,
}

/// Sets up Ctrl+C signal handler that sends shutdown signal.
pub fn setup_shutdown_handler() -> Result<Receiver<()>> {
    let (sender, receiver) = bounded(1);

    ctrlc::set_handler(move || {
        let _ = sender.send(());
    })
    .context("Failed to set Ctrl+C handler")?;

    Ok(receiver)
}

/// Creates a file watcher with debouncing.
pub fn create_file_watcher(
    sender: Sender<Vec<DebouncedEvent>>,
    debounce_milliseconds: u64,
) -> Result<Debouncer<impl notify::Watcher>> {
    let debouncer = new_debouncer(
        Duration::from_millis(debounce_milliseconds),
        move |result: DebounceEventResult| match result {
            Ok(events) => {
                let _ = sender.send(events);
            }
            Err(error) => {
                eprintln!("File watch error: {error:?}");
            }
        },
    )
    .context("Failed to create file watcher")?;

    Ok(debouncer)
}

/// Runs the event loop, handling file changes and shutdown signals.
///
/// Uses crossbeam-channel select! to multiplex between file events and shutdown signal.
/// Filters file events to exclude output directory before calling `on_change` callback.
#[allow(clippy::needless_pass_by_value)]
pub fn run_event_loop<F>(
    file_events: Receiver<Vec<DebouncedEvent>>,
    shutdown: Receiver<()>,
    output_directory: &Path,
    mut on_change: F,
) -> Result<()>
where
    F: FnMut(&[PathBuf]) -> Result<()>,
{
    loop {
        select! {
            recv(file_events) -> result => {
                if let Ok(events) = result {
                    let changed_paths = extract_changed_paths(&events, output_directory);
                    if !changed_paths.is_empty() {
                        on_change(&changed_paths)?;
                    }
                }
            }
            recv(shutdown) -> _ => {
                println!("\nStopping watch mode...");
                break;
            }
        }
    }

    Ok(())
}

/// Extracts file paths from debounced events, filtering out paths in output directory.
fn extract_changed_paths(events: &[DebouncedEvent], output_directory: &Path) -> Vec<PathBuf> {
    events
        .iter()
        .filter(|event| matches!(event.kind, DebouncedEventKind::Any))
        .map(|event| &event.path)
        .filter(|path| should_watch_path(path, output_directory))
        .cloned()
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    use tempfile::TempDir;

    #[test]
    fn test_extract_changed_paths_filters_output_directory() {
        let temporary_directory = TempDir::new().unwrap();
        let output_directory = temporary_directory.path().join("generated");
        let source_file = temporary_directory.path().join("src/test.ts");

        let events = vec![
            DebouncedEvent {
                path: source_file.clone(),
                kind: DebouncedEventKind::Any,
            },
            DebouncedEvent {
                path: output_directory.join("server.ts"),
                kind: DebouncedEventKind::Any,
            },
        ];

        let changed_paths = extract_changed_paths(&events, &output_directory);

        assert_eq!(changed_paths.len(), 1);
        assert_eq!(changed_paths[0], source_file);
    }

    #[test]
    fn test_extract_changed_paths_empty_when_all_filtered() {
        let temporary_directory = TempDir::new().unwrap();
        let output_directory = temporary_directory.path().join("generated");

        let events = vec![DebouncedEvent {
            path: output_directory.join("server.ts"),
            kind: DebouncedEventKind::Any,
        }];

        let changed_paths = extract_changed_paths(&events, &output_directory);

        assert!(changed_paths.is_empty());
    }

    #[test]
    fn test_setup_shutdown_handler_creates_receiver() {
        let receiver = setup_shutdown_handler();
        assert!(receiver.is_ok());
    }
}
