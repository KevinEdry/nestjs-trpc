use std::collections::HashSet;
use std::fs;
use std::path::{Component, Path, PathBuf};

use jsonc_parser::{parse_to_serde_value, ParseOptions};
use serde_json::{Map, Value};
use tracing::debug;

/// Resolves `compilerOptions` from a project's tsconfig.json, following
/// the full `extends` chain exactly like TypeScript.
///
/// Returns `None` if no tsconfig.json exists or it cannot be parsed.
#[must_use]
pub fn resolve_compiler_options(base_directory: &Path) -> Option<Map<String, Value>> {
    let tsconfig_path = base_directory.join("tsconfig.json");
    if !tsconfig_path.is_file() {
        return None;
    }

    let mut seen = HashSet::new();
    resolve_tsconfig_internal(&tsconfig_path, &mut seen)
}

fn resolve_tsconfig_internal(
    tsconfig_path: &Path,
    seen: &mut HashSet<PathBuf>,
) -> Option<Map<String, Value>> {
    let canonical = fs::canonicalize(tsconfig_path).ok()?;

    if !seen.insert(canonical.clone()) {
        debug!("Cyclic extends detected: {}", tsconfig_path.display());
        return None;
    }

    let contents = fs::read_to_string(&canonical).ok()?;
    let parsed: Value = parse_to_serde_value(&contents, &ParseOptions::default())
        .map_err(|error| {
            debug!("JSONC parse error in {}: {:?}", canonical.display(), error);
        })
        .ok()?;

    let obj = parsed.as_object()?;
    let tsconfig_directory = canonical.parent()?;

    let child_options = obj
        .get("compilerOptions")
        .and_then(|value| value.as_object())
        .cloned()
        .unwrap_or_default();

    let extends_value = match obj.get("extends") {
        Some(Value::String(string)) => Some(string.as_str().to_owned()),
        Some(Value::Array(array)) => {
            let merged = merge_extends_array(array, tsconfig_directory, seen);
            return Some(merge_compiler_options(merged, child_options));
        }
        _ => None,
    };

    let Some(extends_str) = extends_value else {
        return Some(child_options);
    };

    let parent_options = resolve_extends_path(&extends_str, tsconfig_directory)
        .and_then(|parent_path| resolve_tsconfig_internal(&parent_path, seen));

    let Some(options) = parent_options else {
        debug!(
            "Unresolvable extends '{}' from {}",
            extends_str,
            canonical.display()
        );
        return Some(child_options);
    };

    Some(merge_compiler_options(options, child_options))
}

fn merge_extends_array(
    array: &[Value],
    tsconfig_directory: &Path,
    seen: &mut HashSet<PathBuf>,
) -> Map<String, Value> {
    let mut merged = Map::new();
    for item in array {
        let Some(extends_str) = item.as_str() else {
            continue;
        };
        let Some(parent_path) = resolve_extends_path(extends_str, tsconfig_directory) else {
            continue;
        };
        let Some(parent_options) = resolve_tsconfig_internal(&parent_path, seen) else {
            continue;
        };
        merged = merge_compiler_options(parent_options, merged);
    }
    merged
}

fn resolve_extends_path(extends: &str, tsconfig_directory: &Path) -> Option<PathBuf> {
    let extends_path = Path::new(extends);

    if extends_path.is_absolute() || extends.starts_with('.') || !extends_path.has_root() {
        return try_resolve_path(tsconfig_directory, extends_path);
    }

    let (package_name, subpath) = split_package_reference(extends);
    resolve_package_extends(tsconfig_directory, &package_name, &subpath)
}

fn try_resolve_path(base_directory: &Path, path: &Path) -> Option<PathBuf> {
    let resolved = if path.is_absolute() {
        path.to_path_buf()
    } else {
        base_directory.join(path)
    };

    let resolved: PathBuf = resolved
        .components()
        .filter(|component| !matches!(component, Component::CurDir))
        .collect();

    if resolved.is_file() {
        return Some(resolved);
    }

    let with_json_extension = resolved.with_extension("json");
    if with_json_extension.is_file() {
        return Some(with_json_extension);
    }

    let as_directory = resolved.join("tsconfig.json");
    if as_directory.is_file() {
        return Some(as_directory);
    }

    None
}

fn split_package_reference(extends: &str) -> (String, String) {
    if let Some(stripped) = extends.strip_prefix('@') {
        return split_scoped_package(stripped, extends);
    }

    let Some(slash_position) = extends.find('/') else {
        return (extends.to_string(), String::new());
    };

    let package_name = extends[..slash_position].to_string();
    let subpath = extends[slash_position + 1..].to_string();
    (package_name, subpath)
}

fn split_scoped_package(stripped: &str, full: &str) -> (String, String) {
    let Some(first_slash) = stripped.find('/') else {
        return (full.to_string(), String::new());
    };

    let scope_end = first_slash + 1;
    let rest = &full[scope_end + 1..];

    let Some(second_slash) = rest.find('/') else {
        return (full.to_string(), String::new());
    };

    let package_end = scope_end + second_slash + 1;
    let package_name = full[..package_end].to_string();
    let subpath = full[package_end + 1..].to_string();
    (package_name, subpath)
}

fn resolve_package_extends(
    start_directory: &Path,
    package_name: &str,
    subpath: &str,
) -> Option<PathBuf> {
    let mut current = Some(start_directory.to_path_buf());
    while let Some(directory) = current.take() {
        let node_modules = directory.join("node_modules");
        let package_directory = node_modules.join(package_name);

        if let Some(found) = resolve_in_package(&package_directory, subpath) {
            return Some(found);
        }

        current = directory.parent().map(Path::to_path_buf);
    }

    None
}

fn resolve_in_package(package_directory: &Path, subpath: &str) -> Option<PathBuf> {
    if !package_directory.is_dir() {
        return None;
    }

    if subpath.is_empty() {
        let tsconfig_path = package_directory.join("tsconfig.json");
        return tsconfig_path.is_file().then_some(tsconfig_path);
    }

    let resolved = package_directory.join(subpath);
    try_resolve_path(package_directory, &resolved)
}

fn merge_compiler_options(
    parent: Map<String, Value>,
    child: Map<String, Value>,
) -> Map<String, Value> {
    let mut merged = parent;
    for (key, value) in child {
        merged.insert(key, value);
    }
    merged
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    #[test]
    fn test_no_tsconfig() {
        let temporary_directory = TempDir::new().unwrap();
        let result = resolve_compiler_options(temporary_directory.path());
        assert_eq!(result, None);
    }

    #[test]
    fn test_simple_compiler_options() {
        let temporary_directory = TempDir::new().unwrap();
        let base = temporary_directory.path();

        let tsconfig = serde_json::json!({
            "compilerOptions": {
                "module": "NodeNext",
                "strict": true
            }
        });
        fs::write(
            base.join("tsconfig.json"),
            serde_json::to_string_pretty(&tsconfig).unwrap(),
        )
        .unwrap();

        let result = resolve_compiler_options(base).unwrap();
        assert_eq!(
            result.get("module").and_then(|v| v.as_str()),
            Some("NodeNext")
        );
        assert_eq!(
            result.get("strict").and_then(serde_json::Value::as_bool),
            Some(true)
        );
    }

    #[test]
    fn test_jsonc_comments_and_trailing_commas() {
        let temporary_directory = TempDir::new().unwrap();
        let base = temporary_directory.path();

        let tsconfig = r#"{
            // this is a comment
            "compilerOptions": {
                "module": "NodeNext",
                "strict": true, // trailing comma
            },
        }"#;
        fs::write(base.join("tsconfig.json"), tsconfig).unwrap();

        let result = resolve_compiler_options(base).unwrap();
        assert_eq!(
            result.get("module").and_then(|v| v.as_str()),
            Some("NodeNext")
        );
    }

    #[test]
    fn test_extends_inherits_compiler_options() {
        let temporary_directory = TempDir::new().unwrap();
        let base = temporary_directory.path();

        let parent = serde_json::json!({
            "compilerOptions": {
                "module": "NodeNext",
                "strict": true
            }
        });
        fs::write(
            base.join("tsconfig.base.json"),
            serde_json::to_string_pretty(&parent).unwrap(),
        )
        .unwrap();

        let child = serde_json::json!({
            "extends": "./tsconfig.base.json",
            "compilerOptions": {
                "outDir": "./dist"
            }
        });
        fs::write(
            base.join("tsconfig.json"),
            serde_json::to_string_pretty(&child).unwrap(),
        )
        .unwrap();

        let result = resolve_compiler_options(base).unwrap();
        assert_eq!(
            result.get("module").and_then(|v| v.as_str()),
            Some("NodeNext")
        );
        assert_eq!(
            result.get("strict").and_then(serde_json::Value::as_bool),
            Some(true)
        );
        assert_eq!(
            result.get("outDir").and_then(|v| v.as_str()),
            Some("./dist")
        );
    }

    #[test]
    fn test_extends_child_overrides_parent() {
        let temporary_directory = TempDir::new().unwrap();
        let base = temporary_directory.path();

        let parent = serde_json::json!({
            "compilerOptions": {
                "module": "NodeNext",
                "strict": true
            }
        });
        fs::write(
            base.join("tsconfig.base.json"),
            serde_json::to_string_pretty(&parent).unwrap(),
        )
        .unwrap();

        let child = serde_json::json!({
            "extends": "./tsconfig.base.json",
            "compilerOptions": {
                "module": "ESNext",
                "strict": false
            }
        });
        fs::write(
            base.join("tsconfig.json"),
            serde_json::to_string_pretty(&child).unwrap(),
        )
        .unwrap();

        let result = resolve_compiler_options(base).unwrap();
        assert_eq!(
            result.get("module").and_then(|v| v.as_str()),
            Some("ESNext")
        );
        assert_eq!(
            result.get("strict").and_then(serde_json::Value::as_bool),
            Some(false)
        );
    }

    #[test]
    fn test_extends_three_level_chain() {
        let temporary_directory = TempDir::new().unwrap();
        let base = temporary_directory.path();

        let grandparent = serde_json::json!({
            "compilerOptions": {
                "target": "ES2020"
            }
        });
        fs::write(
            base.join("tsconfig.base.json"),
            serde_json::to_string_pretty(&grandparent).unwrap(),
        )
        .unwrap();

        let parent = serde_json::json!({
            "extends": "./tsconfig.base.json",
            "compilerOptions": {
                "module": "NodeNext"
            }
        });
        fs::write(
            base.join("tsconfig.project.json"),
            serde_json::to_string_pretty(&parent).unwrap(),
        )
        .unwrap();

        let child = serde_json::json!({
            "extends": "./tsconfig.project.json",
            "compilerOptions": {
                "outDir": "./dist"
            }
        });
        fs::write(
            base.join("tsconfig.json"),
            serde_json::to_string_pretty(&child).unwrap(),
        )
        .unwrap();

        let result = resolve_compiler_options(base).unwrap();
        assert_eq!(
            result.get("target").and_then(|v| v.as_str()),
            Some("ES2020")
        );
        assert_eq!(
            result.get("module").and_then(|v| v.as_str()),
            Some("NodeNext")
        );
        assert_eq!(
            result.get("outDir").and_then(|v| v.as_str()),
            Some("./dist")
        );
    }

    #[test]
    fn test_cyclic_extends_does_not_loop() {
        let temporary_directory = TempDir::new().unwrap();
        let base = temporary_directory.path();

        let a = serde_json::json!({
            "extends": "./tsconfig.b.json",
            "compilerOptions": {
                "module": "NodeNext"
            }
        });
        fs::write(
            base.join("tsconfig.a.json"),
            serde_json::to_string_pretty(&a).unwrap(),
        )
        .unwrap();

        let b = serde_json::json!({
            "extends": "./tsconfig.a.json",
            "compilerOptions": {
                "moduleResolution": "NodeNext"
            }
        });
        fs::write(
            base.join("tsconfig.b.json"),
            serde_json::to_string_pretty(&b).unwrap(),
        )
        .unwrap();

        let main = serde_json::json!({
            "extends": "./tsconfig.a.json",
            "compilerOptions": {}
        });
        fs::write(
            base.join("tsconfig.json"),
            serde_json::to_string_pretty(&main).unwrap(),
        )
        .unwrap();

        let result = resolve_compiler_options(base).unwrap();
        assert_eq!(
            result.get("module").and_then(|v| v.as_str()),
            Some("NodeNext")
        );
        assert_eq!(
            result.get("moduleResolution").and_then(|v| v.as_str()),
            Some("NodeNext")
        );
    }

    #[test]
    fn test_extends_array_type_script_5_plus() {
        let temporary_directory = TempDir::new().unwrap();
        let base = temporary_directory.path();

        let common = serde_json::json!({
            "compilerOptions": {
                "strict": true,
                "target": "ES2020"
            }
        });
        fs::write(
            base.join("tsconfig.common.json"),
            serde_json::to_string_pretty(&common).unwrap(),
        )
        .unwrap();

        let node = serde_json::json!({
            "compilerOptions": {
                "module": "NodeNext",
                "moduleResolution": "NodeNext"
            }
        });
        fs::write(
            base.join("tsconfig.node.json"),
            serde_json::to_string_pretty(&node).unwrap(),
        )
        .unwrap();

        let main = serde_json::json!({
            "extends": ["./tsconfig.common.json", "./tsconfig.node.json"],
            "compilerOptions": {
                "outDir": "./dist"
            }
        });
        fs::write(
            base.join("tsconfig.json"),
            serde_json::to_string_pretty(&main).unwrap(),
        )
        .unwrap();

        let result = resolve_compiler_options(base).unwrap();
        assert_eq!(
            result.get("strict").and_then(serde_json::Value::as_bool),
            Some(true)
        );
        assert_eq!(
            result.get("target").and_then(|v| v.as_str()),
            Some("ES2020")
        );
        assert_eq!(
            result.get("module").and_then(|v| v.as_str()),
            Some("NodeNext")
        );
        assert_eq!(
            result.get("outDir").and_then(|v| v.as_str()),
            Some("./dist")
        );
    }

    #[test]
    fn test_relative_extends_without_extension() {
        let temporary_directory = TempDir::new().unwrap();
        let base = temporary_directory.path();

        let parent = serde_json::json!({
            "compilerOptions": {
                "module": "NodeNext"
            }
        });
        // Without .json extension in filename
        fs::write(
            base.join("base.json"),
            serde_json::to_string_pretty(&parent).unwrap(),
        )
        .unwrap();

        let child = serde_json::json!({
            "extends": "./base",
            "compilerOptions": {
                "outDir": "./dist"
            }
        });
        fs::write(
            base.join("tsconfig.json"),
            serde_json::to_string_pretty(&child).unwrap(),
        )
        .unwrap();

        let result = resolve_compiler_options(base).unwrap();
        assert_eq!(
            result.get("module").and_then(|v| v.as_str()),
            Some("NodeNext")
        );
    }

    #[test]
    fn test_missing_extends_falls_back_to_own_options() {
        let temporary_directory = TempDir::new().unwrap();
        let base = temporary_directory.path();

        let child = serde_json::json!({
            "extends": "./nonexistent.json",
            "compilerOptions": {
                "module": "ESNext"
            }
        });
        fs::write(
            base.join("tsconfig.json"),
            serde_json::to_string_pretty(&child).unwrap(),
        )
        .unwrap();

        let result = resolve_compiler_options(base).unwrap();
        assert_eq!(
            result.get("module").and_then(|v| v.as_str()),
            Some("ESNext")
        );
    }

    #[test]
    fn test_empty_tsconfig() {
        let temporary_directory = TempDir::new().unwrap();
        let base = temporary_directory.path();

        fs::write(base.join("tsconfig.json"), "{}").unwrap();

        let result = resolve_compiler_options(base);
        assert!(result.is_some());
        assert!(result.unwrap().is_empty());
    }

    #[test]
    fn test_invalid_jsonc_recovers() {
        let temporary_directory = TempDir::new().unwrap();
        let base = temporary_directory.path();

        fs::write(base.join("tsconfig.json"), "not valid").unwrap();

        let result = resolve_compiler_options(base);
        assert_eq!(result, None);
    }
}
