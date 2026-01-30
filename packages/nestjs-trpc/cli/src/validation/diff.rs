use serde::Serialize;
use similar::{ChangeTag, TextDiff};

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DiffResult {
    pub has_changes: bool,
    pub lines_added: usize,
    pub lines_removed: usize,
    pub unified_diff: String,
}

const DIFF_CONTEXT_LINES: usize = 3;

#[must_use]
pub fn compute_diff(old_content: Option<&str>, new_content: &str, file_path: &str) -> DiffResult {
    let old = old_content.unwrap_or("");

    if old == new_content {
        return DiffResult {
            has_changes: false,
            lines_added: 0,
            lines_removed: 0,
            unified_diff: String::new(),
        };
    }

    let text_diff = TextDiff::from_lines(old, new_content);

    let mut lines_added = 0;
    let mut lines_removed = 0;

    for change in text_diff.iter_all_changes() {
        match change.tag() {
            ChangeTag::Insert => lines_added += 1,
            ChangeTag::Delete => lines_removed += 1,
            ChangeTag::Equal => {}
        }
    }

    let old_header = if old_content.is_some() {
        format!("a/{file_path}")
    } else {
        "/dev/null".to_string()
    };
    let new_header = format!("b/{file_path}");

    let unified_diff = text_diff
        .unified_diff()
        .context_radius(DIFF_CONTEXT_LINES)
        .header(&old_header, &new_header)
        .to_string();

    DiffResult {
        has_changes: true,
        lines_added,
        lines_removed,
        unified_diff,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn detects_no_changes_when_content_identical() {
        let content = "line 1\nline 2\nline 3\n";
        let result = compute_diff(Some(content), content, "test.ts");

        assert!(!result.has_changes);
        assert_eq!(result.lines_added, 0);
        assert_eq!(result.lines_removed, 0);
        assert!(result.unified_diff.is_empty());
    }

    #[test]
    fn detects_new_file() {
        let new_content = "line 1\nline 2\n";
        let result = compute_diff(None, new_content, "new-file.ts");

        assert!(result.has_changes);
        assert_eq!(result.lines_added, 2);
        assert_eq!(result.lines_removed, 0);
        assert!(result.unified_diff.contains("/dev/null"));
        assert!(result.unified_diff.contains("b/new-file.ts"));
    }

    #[test]
    fn counts_added_and_removed_lines() {
        let old_content = "line 1\nline 2\nline 3\n";
        let new_content = "line 1\nmodified line\nline 3\nnew line\n";
        let result = compute_diff(Some(old_content), new_content, "modified.ts");

        assert!(result.has_changes);
        assert_eq!(result.lines_added, 2);
        assert_eq!(result.lines_removed, 1);
    }

    #[test]
    fn includes_file_path_in_diff_header() {
        let old_content = "old\n";
        let new_content = "new\n";
        let result = compute_diff(Some(old_content), new_content, "src/router.ts");

        assert!(result.unified_diff.contains("a/src/router.ts"));
        assert!(result.unified_diff.contains("b/src/router.ts"));
    }

    #[test]
    fn handles_empty_old_content() {
        let new_content = "first line\n";
        let result = compute_diff(Some(""), new_content, "file.ts");

        assert!(result.has_changes);
        assert_eq!(result.lines_added, 1);
        assert_eq!(result.lines_removed, 0);
    }
}
