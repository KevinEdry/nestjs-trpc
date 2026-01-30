use crate::scanner::FileScanner;
use anyhow::{Context, Result};
use std::path::{Path, PathBuf};
use tracing::trace;

const NODE_MODULES_DIRECTORY: &str = "node_modules";

/// Determines if a path should be watched for changes.
///
/// Excludes:
/// - Files inside the output directory (to prevent infinite regeneration loops)
/// - Files inside `node_modules`
/// - Non-TypeScript files
pub fn should_watch_path(path: &Path, output_directory: &Path) -> bool {
    if path.starts_with(output_directory) {
        trace!(
            path = %path.display(),
            output_directory = %output_directory.display(),
            "Skipping output directory"
        );
        return false;
    }

    if path
        .components()
        .any(|component| component.as_os_str() == NODE_MODULES_DIRECTORY)
    {
        trace!(path = %path.display(), "Skipping node_modules");
        return false;
    }

    let has_typescript_extension =
        path.extension().and_then(|extension| extension.to_str()) == Some("ts");

    if !has_typescript_extension {
        trace!(path = %path.display(), "Skipping non-TypeScript file");
        return false;
    }

    true
}

/// Finds all files matching the pattern that should be watched.
///
/// Uses the scanner to find files, then filters out paths that shouldn't be watched
/// (output directory, `node_modules`).
pub fn find_watchable_files(
    base_directory: &Path,
    pattern: &str,
    output_directory: &Path,
) -> Result<Vec<PathBuf>> {
    let scanner = FileScanner::new(base_directory).with_context(|| {
        format!(
            "Failed to initialize scanner for '{}'",
            base_directory.display()
        )
    })?;

    let files = scanner
        .scan(pattern)
        .with_context(|| format!("Failed to scan for files with pattern '{pattern}'"))?;

    let watchable_files: Vec<PathBuf> = files
        .into_iter()
        .filter(|path| should_watch_path(path, output_directory))
        .collect();

    Ok(watchable_files)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use tempfile::TempDir;

    fn setup_test_directory() -> TempDir {
        let temporary_directory = TempDir::new().expect("Failed to create temporary directory");

        // Create a non-hidden subdirectory inside temp to avoid scanner filtering
        // (scanner filters directories starting with '.')
        let test_root = temporary_directory.path().join("test_project");
        fs::create_dir(&test_root).unwrap();

        fs::create_dir_all(test_root.join("src/routers")).unwrap();
        fs::create_dir_all(test_root.join("src/generated")).unwrap();
        fs::create_dir_all(test_root.join("node_modules")).unwrap();

        fs::write(
            test_root.join("src/routers/user.router.ts"),
            "// user router",
        )
        .unwrap();
        fs::write(
            test_root.join("src/routers/post.router.ts"),
            "// post router",
        )
        .unwrap();
        fs::write(
            test_root.join("src/generated/server.ts"),
            "// generated file",
        )
        .unwrap();
        fs::write(test_root.join("node_modules/package.js"), "// dependency").unwrap();
        fs::write(test_root.join("src/config.json"), "{}").unwrap();

        temporary_directory
    }

    #[test]
    fn test_should_watch_path_accepts_typescript_files() {
        let temporary_directory = setup_test_directory();
        let base = temporary_directory.path().join("test_project");
        let output_directory = base.join("src/generated");
        let router_file = base.join("src/routers/user.router.ts");

        assert!(should_watch_path(&router_file, &output_directory));
    }

    #[test]
    fn test_should_watch_path_excludes_output_directory() {
        let temporary_directory = setup_test_directory();
        let base = temporary_directory.path().join("test_project");
        let output_directory = base.join("src/generated");
        let generated_file = base.join("src/generated/server.ts");

        assert!(!should_watch_path(&generated_file, &output_directory));
    }

    #[test]
    fn test_should_watch_path_excludes_node_modules() {
        let temporary_directory = setup_test_directory();
        let base = temporary_directory.path().join("test_project");
        let output_directory = base.join("src/generated");
        let dependency_file = base.join("node_modules/package.js");

        assert!(!should_watch_path(&dependency_file, &output_directory));
    }

    #[test]
    fn test_should_watch_path_excludes_non_typescript_files() {
        let temporary_directory = setup_test_directory();
        let base = temporary_directory.path().join("test_project");
        let output_directory = base.join("src/generated");
        let json_file = base.join("src/config.json");

        assert!(!should_watch_path(&json_file, &output_directory));
    }

    #[test]
    fn test_find_watchable_files_filters_correctly() {
        let temporary_directory = setup_test_directory();
        let base = temporary_directory.path().join("test_project");
        let output_directory = base.join("src/generated");

        let watchable_files = find_watchable_files(&base, "**/*.ts", &output_directory).unwrap();

        assert_eq!(watchable_files.len(), 2);
        assert!(watchable_files
            .iter()
            .all(|path| path.to_string_lossy().contains("router")));
        assert!(watchable_files
            .iter()
            .all(|path| !path.starts_with(&output_directory)));
        assert!(watchable_files
            .iter()
            .all(|path| !path.to_string_lossy().contains("node_modules")));
    }
}
