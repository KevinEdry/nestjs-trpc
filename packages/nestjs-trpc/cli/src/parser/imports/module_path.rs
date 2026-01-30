use std::path::{Path, PathBuf};
use tracing::trace;

/// Resolves a module specifier to an actual file path.
/// Tries multiple extensions (.ts, .tsx) and index files.
pub fn resolve_module_path(source_directory: &Path, specifier: &str) -> Option<PathBuf> {
    let base_path = source_directory.join(specifier);

    let ts_path = PathBuf::from(format!("{}.ts", base_path.display()));
    trace!(checking = ?ts_path, exists = ts_path.exists(), "Checking with .ts appended");
    if ts_path.exists() {
        return Some(ts_path);
    }

    let tsx_path = PathBuf::from(format!("{}.tsx", base_path.display()));
    if tsx_path.exists() {
        return Some(tsx_path);
    }

    let with_ts = base_path.with_extension("ts");
    trace!(checking = ?with_ts, exists = with_ts.exists(), "Checking with .ts replacing extension");
    if with_ts.exists() {
        return Some(with_ts);
    }

    let with_tsx = base_path.with_extension("tsx");
    if with_tsx.exists() {
        return Some(with_tsx);
    }

    let index_ts = base_path.join("index.ts");
    if index_ts.exists() {
        return Some(index_ts);
    }

    if base_path.exists() {
        return Some(base_path);
    }

    None
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use tempfile::TempDir;

    fn create_temp_directory() -> TempDir {
        TempDir::new().expect("Failed to create temp dir")
    }

    fn write_file(directory: &Path, name: &str, content: &str) -> PathBuf {
        let path = directory.join(name);
        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent).expect("Failed to create parent dir");
        }
        fs::write(&path, content).expect("Failed to write file");
        path
    }

    #[test]
    fn test_resolve_with_ts_extension() {
        let temp_directory = create_temp_directory();
        let base = temp_directory.path();

        write_file(base, "schema.ts", "export const x = 1;");

        let resolved = resolve_module_path(base, "./schema");
        assert!(resolved.is_some());
        assert!(resolved.unwrap().ends_with("schema.ts"));
    }

    #[test]
    fn test_resolve_with_tsx_extension() {
        let temp_directory = create_temp_directory();
        let base = temp_directory.path();

        write_file(base, "component.tsx", "export const x = 1;");

        let resolved = resolve_module_path(base, "./component");
        assert!(resolved.is_some());
        assert!(resolved.unwrap().ends_with("component.tsx"));
    }

    #[test]
    fn test_resolve_index_file() {
        let temp_directory = create_temp_directory();
        let base = temp_directory.path();

        write_file(base, "schemas/index.ts", "export const x = 1;");

        let resolved = resolve_module_path(base, "./schemas");
        assert!(resolved.is_some());
        assert!(resolved.unwrap().ends_with("index.ts"));
    }

    #[test]
    fn test_resolve_nonexistent() {
        let temp_directory = create_temp_directory();
        let base = temp_directory.path();

        let resolved = resolve_module_path(base, "./nonexistent");
        assert!(resolved.is_none());
    }
}
