use std::path::Path;

#[must_use]
pub(crate) fn calculate_relative_import_path(from_dir: &Path, to_file: &Path) -> String {
    let relative = pathdiff::diff_paths(to_file, from_dir).map_or_else(
        || to_file.to_string_lossy().to_string(),
        |path| path.to_string_lossy().to_string(),
    );

    // Windows paths use backslashes which aren't valid in ES module import specifiers.
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn calculates_relative_import_path_for_same_directory() {
        let result = calculate_relative_import_path(
            Path::new("src/@generated"),
            Path::new("src/@generated/types.ts"),
        );

        assert_eq!(result, "./types");
    }

    #[test]
    fn calculates_relative_import_path_for_parent_directory() {
        let result = calculate_relative_import_path(
            Path::new("src/@generated"),
            Path::new("src/schemas/user.ts"),
        );

        assert_eq!(result, "../schemas/user");
    }

    #[test]
    fn strips_tsx_extensions_from_relative_import_paths() {
        let result = calculate_relative_import_path(
            Path::new("src/@generated"),
            Path::new("src/components/card.tsx"),
        );

        assert_eq!(result, "../components/card");
    }

    #[test]
    fn normalizes_backslashes_in_relative_import_paths() {
        let result = calculate_relative_import_path(
            Path::new("/workspace/generated"),
            Path::new("/workspace/src\\user-router.ts"),
        );

        assert!(
            !result.contains('\\'),
            "Import path must not contain backslashes, got: {result}"
        );
        assert_eq!(result, "../src/user-router");
    }

    #[test]
    fn prepends_dot_slash_for_non_prefixed_relative_import_paths() {
        let result =
            calculate_relative_import_path(Path::new("src"), Path::new("src/helpers/owner"));

        assert_eq!(result, "./helpers/owner");
    }
}
