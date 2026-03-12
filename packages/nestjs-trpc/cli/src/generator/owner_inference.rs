use crate::RouterMetadata;
use std::collections::{HashMap, HashSet};
use std::path::Path;

pub(crate) type OwnerAliasLookup = HashMap<(String, String), String>;

pub(crate) const OWNER_RETURN_TYPE_HELPER_FILE_NAME: &str = "__nestjs-trpc-type-helpers.ts";

pub(crate) fn collect_owner_imports(
    routers: &[RouterMetadata],
    output_file_path: &Path,
) -> (Vec<(String, String)>, OwnerAliasLookup) {
    let output_dir = output_file_path.parent().unwrap_or_else(|| Path::new("."));
    let mut seen_owners: HashSet<(String, String)> = HashSet::new();
    let mut alias_occurrences: HashMap<String, usize> = HashMap::new();
    let mut owner_alias_lookup: OwnerAliasLookup = HashMap::new();
    let mut imports = Vec::new();

    for router in routers {
        for procedure in &router.procedures {
            if procedure.output_schema.is_some() {
                continue;
            }

            let (Some(owner_file_path), Some(owner_class_name)) = (
                procedure.owner_file_path.as_deref(),
                procedure.owner_class_name.as_deref(),
            ) else {
                continue;
            };

            let import_path = calculate_relative_import_path(output_dir, owner_file_path);
            let owner_key = (owner_class_name.to_string(), import_path.clone());
            if seen_owners.insert(owner_key.clone()) {
                let base_alias = owner_module_alias(owner_class_name, &import_path);
                let suffix = alias_occurrences.entry(base_alias.clone()).or_insert(0);
                *suffix += 1;
                let alias = if *suffix == 1 {
                    base_alias
                } else {
                    format!("{base_alias}_{suffix}")
                };

                owner_alias_lookup.insert(owner_key, alias.clone());
                imports.push((alias, import_path));
            }
        }
    }

    (imports, owner_alias_lookup)
}

pub(crate) fn append_owner_module_type_aliases(
    output: &mut String,
    owner_imports: &[(String, String)],
    use_single_quotes: bool,
    use_semicolons: bool,
) {
    if owner_imports.is_empty() {
        return;
    }

    let quote = if use_single_quotes { '\'' } else { '"' };
    let term = if use_semicolons { ";" } else { "" };

    for (alias, import_path) in owner_imports {
        output.push_str(&format!(
            "type {alias} = typeof import({quote}{import_path}{quote}){term}\n"
        ));
    }
}

pub(crate) fn append_owner_return_type_helper_import(
    output: &mut String,
    output_file_path: &Path,
    use_single_quotes: bool,
    use_semicolons: bool,
) {
    let output_dir = output_file_path.parent().unwrap_or_else(|| Path::new("."));
    let helper_path = output_dir.join(OWNER_RETURN_TYPE_HELPER_FILE_NAME);
    let helper_import_path = calculate_relative_import_path(output_dir, &helper_path);

    let quote = if use_single_quotes { '\'' } else { '"' };
    let term = if use_semicolons { ";" } else { "" };

    output.push_str(&format!(
        "import type {{ __ResolveProcedureReturnType }} from {quote}{helper_import_path}{quote}{term}\n"
    ));
}

#[must_use]
pub(crate) fn needs_owner_return_type_helper(routers: &[RouterMetadata]) -> bool {
    routers
        .iter()
        .flat_map(|router| &router.procedures)
        .any(|procedure| {
            procedure.output_schema.is_none()
                && procedure.owner_file_path.is_some()
                && procedure.owner_class_name.is_some()
        })
}

#[must_use]
pub(crate) fn generate_owner_return_type_helper_file(use_semicolons: bool) -> String {
    let term = if use_semicolons { ";" } else { "" };
    let type_body = owner_return_type_helper_type();
    format!(
        "\
/**
 * AUTO-GENERATED FILE - DO NOT EDIT!
 *
 * Shared type helpers used by generated server.ts files.
 * Requires TypeScript 4.5+.
 */
{type_body}{term}
"
    )
}

#[must_use]
pub(crate) fn calculate_relative_import_path(from_dir: &Path, to_file: &Path) -> String {
    let relative = pathdiff::diff_paths(to_file, from_dir).map_or_else(
        || to_file.to_string_lossy().to_string(),
        |p| p.to_string_lossy().to_string(),
    );

    let relative = relative.replace('\\', "/");
    let without_ext = relative
        .strip_suffix(".ts")
        .or_else(|| relative.strip_suffix(".tsx"))
        .unwrap_or(&relative);

    if without_ext.starts_with('.') || without_ext.starts_with('/') {
        without_ext.to_string()
    } else {
        format!("./{without_ext}")
    }
}

#[must_use]
pub(crate) fn owner_module_alias(owner_class_name: &str, import_path: &str) -> String {
    let class_name_part = sanitize_class_name_for_alias(owner_class_name);
    let class_name_part = if class_name_part.is_empty() {
        "Owner".to_string()
    } else {
        class_name_part
    };

    let sanitized_path = sanitize_import_path_for_alias(import_path);
    let path_part = if sanitized_path.is_empty() {
        "root".to_string()
    } else {
        sanitized_path
    };

    format!("__{class_name_part}Module_{path_part}")
}

fn owner_return_type_helper_type() -> &'static str {
    "\
export type __ResolveProcedureReturnType<
  TModule,
  TOwnerName extends string,
  TMethodName extends string,
> = TModule extends { readonly [K in TOwnerName]: infer TClass }
  ? TClass extends abstract new (...args: any[]) => any
    ? TMethodName extends keyof InstanceType<TClass>
      ? InstanceType<TClass>[TMethodName] extends (...args: any[]) => any
        ? ReturnType<InstanceType<TClass>[TMethodName]>
        : any
      : any
    : any
  : TModule extends { readonly default: infer TDefault }
    ? TDefault extends abstract new (...args: any[]) => any
      ? TMethodName extends keyof InstanceType<TDefault>
        ? InstanceType<TDefault>[TMethodName] extends (...args: any[]) => any
          ? ReturnType<InstanceType<TDefault>[TMethodName]>
          : any
        : any
      : any
    : any"
}

fn sanitize_class_name_for_alias(owner_class_name: &str) -> String {
    owner_class_name
        .chars()
        .filter(|ch| ch.is_ascii_alphanumeric() || *ch == '_')
        .collect::<String>()
        .trim_matches('_')
        .to_string()
}

#[must_use]
pub fn sanitize_import_path_for_alias(import_path: &str) -> String {
    let mut normalized = import_path.replace('\\', "/");
    while let Some(stripped) = normalized.strip_prefix("../") {
        normalized = stripped.to_string();
    }
    if let Some(stripped) = normalized.strip_prefix("./") {
        normalized = stripped.to_string();
    }

    let normalized = normalized.trim_start_matches('/');
    let without_ext = normalized
        .strip_suffix(".ts")
        .or_else(|| normalized.strip_suffix(".tsx"))
        .unwrap_or(normalized);

    let mut sanitized = String::new();
    let mut previous_was_separator = false;

    for ch in without_ext.chars() {
        let mapped = if ch.is_ascii_alphanumeric() {
            ch.to_ascii_lowercase()
        } else {
            '_'
        };

        if mapped == '_' {
            if !previous_was_separator {
                sanitized.push('_');
            }
            previous_was_separator = true;
        } else {
            sanitized.push(mapped);
            previous_was_separator = false;
        }
    }

    sanitized.trim_matches('_').to_string()
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{ProcedureMetadata, ProcedureType};
    use std::path::PathBuf;

    fn create_test_procedure(name: &str, output: Option<&str>) -> ProcedureMetadata {
        ProcedureMetadata {
            name: name.to_string(),
            procedure_type: ProcedureType::Query,
            input_schema: None,
            output_schema: output.map(std::string::ToString::to_string),
            owner_class_name: None,
            owner_file_path: None,
            input_schema_ref: None,
            output_schema_ref: None,
            schema_identifiers: Vec::new(),
        }
    }

    fn create_test_router(name: &str, procedures: Vec<ProcedureMetadata>) -> RouterMetadata {
        RouterMetadata {
            name: name.to_string(),
            alias: Some("users".to_string()),
            file_path: PathBuf::from("test.router.ts"),
            procedures,
        }
    }

    #[test]
    fn test_owner_module_alias_includes_readable_path_segments() {
        let alias = owner_module_alias("UserRouter", "../src/user.router");
        assert_eq!(alias, "__UserRouterModule_src_user_router");
    }

    #[test]
    fn test_collect_owner_imports_adds_suffix_when_aliases_collide() {
        let mut dashed = create_test_procedure("getByDash", None);
        dashed.owner_class_name = Some("UserRouter".to_string());
        dashed.owner_file_path = Some(PathBuf::from("/workspace/src/user-router.ts"));

        let mut underscored = create_test_procedure("getByUnderscore", None);
        underscored.owner_class_name = Some("UserRouter".to_string());
        underscored.owner_file_path = Some(PathBuf::from("/workspace/src/user_router.ts"));

        let routers = vec![create_test_router("UserRouter", vec![dashed, underscored])];
        let output_path = PathBuf::from("/workspace/generated/server.ts");

        let (imports, owner_alias_lookup) = collect_owner_imports(&routers, &output_path);

        assert_eq!(imports.len(), 2);
        assert_eq!(imports[0].0, "__UserRouterModule_src_user_router");
        assert_eq!(imports[1].0, "__UserRouterModule_src_user_router_2");

        let output_dir = output_path.parent().unwrap_or_else(|| Path::new("."));
        let dashed_import_path =
            calculate_relative_import_path(output_dir, Path::new("/workspace/src/user-router.ts"));
        let underscored_import_path =
            calculate_relative_import_path(output_dir, Path::new("/workspace/src/user_router.ts"));

        assert_eq!(
            owner_alias_lookup
                .get(&("UserRouter".to_string(), dashed_import_path))
                .map(String::as_str),
            Some("__UserRouterModule_src_user_router")
        );
        assert_eq!(
            owner_alias_lookup
                .get(&("UserRouter".to_string(), underscored_import_path))
                .map(String::as_str),
            Some("__UserRouterModule_src_user_router_2")
        );
    }

    #[test]
    fn test_needs_owner_return_type_helper_is_true_when_owner_is_resolvable() {
        let mut procedure = create_test_procedure("list", None);
        procedure.owner_class_name = Some("UserRouter".to_string());
        procedure.owner_file_path = Some(PathBuf::from("/workspace/src/user.router.ts"));

        let routers = vec![create_test_router("UserRouter", vec![procedure])];
        assert!(needs_owner_return_type_helper(&routers));
    }

    #[test]
    fn test_needs_owner_return_type_helper_is_false_without_owner_metadata() {
        let procedure = create_test_procedure("list", None);
        let routers = vec![create_test_router("UserRouter", vec![procedure])];
        assert!(!needs_owner_return_type_helper(&routers));
    }

    #[test]
    fn test_generate_owner_return_type_helper_file_contains_ts_requirement() {
        let helper_file_content = generate_owner_return_type_helper_file(true);
        assert!(helper_file_content.contains("Requires TypeScript 4.5+."));
        assert!(helper_file_content.contains("export type __ResolveProcedureReturnType<"));
    }
}
