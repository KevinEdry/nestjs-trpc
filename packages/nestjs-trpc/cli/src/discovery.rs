use crate::error::ConfigError;
use crate::parser::{extract_trpc_options, TsParser};
use serde_json::Value;
use std::fs;
use std::path::{Path, PathBuf};
use tracing::{debug, trace};

const PACKAGE_JSON: &str = "package.json";

const DEFAULT_CANDIDATE_PATHS: &[&str] = &[
    "src/main.ts",
    "src/app.module.ts",
    "lib/main.ts",
    "lib/app.module.ts",
    "app.module.ts",
];

pub fn discover_root_module(base_directory: &Path) -> Result<PathBuf, ConfigError> {
    debug!("Starting root module discovery");

    if let Some(entry_point) = find_entry_point_from_package_json(base_directory)? {
        debug!(entry_point = ?entry_point, "Found entry point from package.json");

        if let Some(module) = find_trpc_module_near(&entry_point) {
            debug!(module = ?module, "Found TRPCModule near package.json entry point");
            return Ok(module);
        }
    }

    for candidate in DEFAULT_CANDIDATE_PATHS {
        let candidate_path = base_directory.join(candidate);
        trace!(candidate = ?candidate_path, "Checking candidate path");

        if !candidate_path.exists() {
            continue;
        }

        if let Some(module) = check_file_for_trpc_module(&candidate_path) {
            debug!(module = ?module, "Found TRPCModule in candidate");
            return Ok(module);
        }
    }

    Err(ConfigError::ModuleNotFound {
        searched_paths: DEFAULT_CANDIDATE_PATHS
            .iter()
            .map(|p| base_directory.join(p))
            .collect(),
    })
}

fn find_entry_point_from_package_json(
    base_directory: &Path,
) -> Result<Option<PathBuf>, ConfigError> {
    let package_json_path = base_directory.join(PACKAGE_JSON);

    if !package_json_path.exists() {
        debug!("No package.json found");
        return Ok(None);
    }

    let contents =
        fs::read_to_string(&package_json_path).map_err(|source| ConfigError::ReadFailed {
            path: package_json_path.clone(),
            source,
        })?;

    let package_json: Value =
        serde_json::from_str(&contents).map_err(|source| ConfigError::InvalidSyntax {
            path: package_json_path.clone(),
            message: format!("Invalid JSON in package.json: {source}"),
        })?;

    if let Some(source_field) = package_json.get("source").and_then(|v| v.as_str()) {
        let source_path = base_directory.join(source_field);
        if source_path.exists() {
            trace!(source = ?source_path, "Found 'source' field in package.json");
            return Ok(Some(source_path));
        }
    }

    if let Some(main_field) = package_json.get("main").and_then(|v| v.as_str()) {
        let main_path = base_directory.join(main_field);

        let typescript_equivalent = main_path.with_extension("").with_extension("ts");

        if typescript_equivalent.exists() {
            trace!(main = ?typescript_equivalent, "Found TypeScript equivalent of 'main' field");
            return Ok(Some(typescript_equivalent));
        }

        if main_path.exists() {
            trace!(main = ?main_path, "Found 'main' field in package.json");
            return Ok(Some(main_path));
        }
    }

    debug!("No valid entry point found in package.json");
    Ok(None)
}

fn find_trpc_module_near(entry_point: &Path) -> Option<PathBuf> {
    if check_file_for_trpc_module(entry_point).is_some() {
        return Some(entry_point.to_path_buf());
    }

    let parent_directory = entry_point.parent()?;

    for candidate in &["app.module.ts", "main.module.ts"] {
        let candidate_path = parent_directory.join(candidate);
        if let Some(module) = check_file_for_trpc_module(&candidate_path) {
            return Some(module);
        }
    }

    None
}

fn check_file_for_trpc_module(file_path: &Path) -> Option<PathBuf> {
    if !file_path.exists() {
        return None;
    }

    let parser = TsParser::new();
    let parsed = parser.parse_file(file_path).ok()?;

    if extract_trpc_options(&parsed).is_some() {
        Some(file_path.to_path_buf())
    } else {
        None
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use tempfile::TempDir;

    fn create_package_json(directory: &Path, main: Option<&str>, source: Option<&str>) {
        let mut package_json = serde_json::json!({
            "name": "test-package",
            "version": "1.0.0"
        });

        if let Some(main_value) = main {
            package_json["main"] = serde_json::json!(main_value);
        }

        if let Some(source_value) = source {
            package_json["source"] = serde_json::json!(source_value);
        }

        fs::write(
            directory.join("package.json"),
            serde_json::to_string_pretty(&package_json).unwrap(),
        )
        .unwrap();
    }

    fn create_module_file(directory: &Path, path: &str, has_trpc: bool) {
        let file_path = directory.join(path);
        if let Some(parent) = file_path.parent() {
            fs::create_dir_all(parent).unwrap();
        }

        let content = if has_trpc {
            r"
            import { Module } from '@nestjs/common';
            import { TRPCModule } from 'nestjs-trpc';

            @Module({
                imports: [
                    TRPCModule.forRoot({
                        autoSchemaFile: './generated',
                    }),
                ],
            })
            export class AppModule {}
            "
        } else {
            r"
            import { Module } from '@nestjs/common';

            @Module({})
            export class AppModule {}
            "
        };

        fs::write(file_path, content).unwrap();
    }

    #[test]
    fn test_discover_from_package_json_source() {
        let temp_directory = TempDir::new().unwrap();
        let base = temp_directory.path();

        create_package_json(base, None, Some("src/main.ts"));
        create_module_file(base, "src/main.ts", true);

        let result = discover_root_module(base).unwrap();
        assert!(result.ends_with("src/main.ts"));
    }

    #[test]
    fn test_discover_from_package_json_main() {
        let temp_directory = TempDir::new().unwrap();
        let base = temp_directory.path();

        create_package_json(base, Some("dist/main.js"), None);
        create_module_file(base, "dist/main.ts", true);

        let result = discover_root_module(base).unwrap();
        assert!(result.ends_with("dist/main.ts"));
    }

    #[test]
    fn test_discover_from_default_candidates() {
        let temp_directory = TempDir::new().unwrap();
        let base = temp_directory.path();

        create_module_file(base, "src/app.module.ts", true);

        let result = discover_root_module(base).unwrap();
        assert!(result.ends_with("src/app.module.ts"));
    }

    #[test]
    fn test_discover_lib_directory() {
        let temp_directory = TempDir::new().unwrap();
        let base = temp_directory.path();

        create_module_file(base, "lib/app.module.ts", true);

        let result = discover_root_module(base).unwrap();
        assert!(result.ends_with("lib/app.module.ts"));
    }

    #[test]
    fn test_discover_current_directory() {
        let temp_directory = TempDir::new().unwrap();
        let base = temp_directory.path();

        create_module_file(base, "app.module.ts", true);

        let result = discover_root_module(base).unwrap();
        assert!(result.ends_with("app.module.ts"));
    }

    #[test]
    fn test_discover_not_found() {
        let temp_directory = TempDir::new().unwrap();
        let base = temp_directory.path();

        create_module_file(base, "src/app.module.ts", false);

        let result = discover_root_module(base);
        assert!(result.is_err());
    }

    #[test]
    fn test_find_trpc_module_near_entry_point() {
        let temp_directory = TempDir::new().unwrap();
        let base = temp_directory.path();

        create_module_file(base, "src/main.ts", false);
        create_module_file(base, "src/app.module.ts", true);

        let entry_point = base.join("src/main.ts");
        let result = find_trpc_module_near(&entry_point);
        assert!(result.is_some());
        assert!(result.unwrap().ends_with("src/app.module.ts"));
    }
}
