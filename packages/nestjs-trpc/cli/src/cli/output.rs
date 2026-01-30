use serde::Serialize;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DryRunOutput {
    pub success: bool,
    pub router_count: usize,
    pub procedure_count: usize,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub diff: Option<DiffSummary>,
    #[serde(skip_serializing_if = "Vec::is_empty")]
    pub validation_errors: Vec<ValidationError>,
    #[serde(skip_serializing_if = "Vec::is_empty")]
    pub parse_errors: Vec<ParseError>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DiffSummary {
    pub has_changes: bool,
    pub files_changed: usize,
    pub lines_added: usize,
    pub lines_removed: usize,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ValidationError {
    pub file: String,
    pub line: usize,
    pub column: usize,
    pub code: String,
    pub message: String,
    pub severity: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ParseError {
    pub file: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub line: Option<usize>,
    pub message: String,
}

#[allow(clippy::expect_used)]
impl DryRunOutput {
    pub fn to_json(&self) -> String {
        // SAFETY: DryRunOutput contains only strings, numbers, and booleans - serde_json serialization is infallible for these types
        serde_json::to_string_pretty(self).expect("Serialization should not fail")
    }

    #[allow(dead_code)] // API method for future compact JSON output
    pub fn to_json_compact(&self) -> String {
        // SAFETY: DryRunOutput contains only strings, numbers, and booleans - serde_json serialization is infallible for these types
        serde_json::to_string(self).expect("Serialization should not fail")
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn serializes_minimal_output() {
        let output = DryRunOutput {
            success: true,
            router_count: 2,
            procedure_count: 5,
            diff: None,
            validation_errors: vec![],
            parse_errors: vec![],
        };

        let json = output.to_json();
        assert!(json.contains("\"success\": true"));
        assert!(json.contains("\"routerCount\": 2"));
        assert!(json.contains("\"procedureCount\": 5"));
        assert!(!json.contains("diff"));
        assert!(!json.contains("validationErrors"));
        assert!(!json.contains("parseErrors"));
    }

    #[test]
    fn serializes_with_diff() {
        let output = DryRunOutput {
            success: true,
            router_count: 1,
            procedure_count: 2,
            diff: Some(DiffSummary {
                has_changes: true,
                files_changed: 1,
                lines_added: 10,
                lines_removed: 5,
            }),
            validation_errors: vec![],
            parse_errors: vec![],
        };

        let json = output.to_json();
        assert!(json.contains("\"hasChanges\": true"));
        assert!(json.contains("\"filesChanged\": 1"));
        assert!(json.contains("\"linesAdded\": 10"));
        assert!(json.contains("\"linesRemoved\": 5"));
    }

    #[test]
    fn serializes_with_errors() {
        let output = DryRunOutput {
            success: false,
            router_count: 0,
            procedure_count: 0,
            diff: None,
            validation_errors: vec![ValidationError {
                file: "src/app.ts".to_string(),
                line: 10,
                column: 5,
                code: "TS2322".to_string(),
                message: "Type error".to_string(),
                severity: "error".to_string(),
            }],
            parse_errors: vec![ParseError {
                file: "src/broken.ts".to_string(),
                line: Some(3),
                message: "Unexpected token".to_string(),
            }],
        };

        let json = output.to_json();
        assert!(json.contains("\"validationErrors\""));
        assert!(json.contains("\"parseErrors\""));
        assert!(json.contains("TS2322"));
    }

    #[test]
    fn compact_json_has_no_whitespace() {
        let output = DryRunOutput {
            success: true,
            router_count: 1,
            procedure_count: 1,
            diff: None,
            validation_errors: vec![],
            parse_errors: vec![],
        };

        let compact = output.to_json_compact();
        assert!(!compact.contains('\n'));
        assert!(!compact.contains("  "));
    }
}
