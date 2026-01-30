use miette::{Diagnostic, NamedSource, SourceSpan};
use std::path::{Path, PathBuf};
use thiserror::Error;

/// Context for displaying source code in error messages.
/// Used internally to create diagnostic errors with source snippets.
pub struct SourceContext {
    pub src: NamedSource<String>,
    pub span: SourceSpan,
}

impl SourceContext {
    /// Creates a new source context from file content and byte offset.
    #[must_use]
    pub fn from_file(path: &Path, content: &str, offset: usize, length: usize) -> Self {
        Self {
            src: NamedSource::new(path.display().to_string(), content.to_string()),
            span: SourceSpan::new(offset.into(), length),
        }
    }

    /// Calculates byte offset from line and column numbers (1-indexed).
    #[must_use]
    pub fn line_column_to_offset(content: &str, line: usize, column: usize) -> usize {
        let line_start = find_line_start_offset(content, line);
        let column_offset = column.saturating_sub(1);
        line_start + column_offset
    }
}

fn find_line_start_offset(content: &str, target_line: usize) -> usize {
    let mut current_line = 1;
    let mut offset = 0;

    for (index, character) in content.char_indices() {
        if current_line == target_line {
            return offset;
        }
        if character == '\n' {
            current_line += 1;
        }
        offset = index + character.len_utf8();
    }

    offset
}

/// Diagnostic error for TypeScript syntax errors with source code context.
#[derive(Error, Debug, Diagnostic)]
#[error("{message}")]
#[diagnostic(
    code(nestjs_trpc::syntax_error),
    help("Check for missing semicolons, brackets, or invalid syntax")
)]
pub struct SyntaxDiagnostic {
    pub message: String,

    #[source_code]
    src: NamedSource<String>,

    #[label("error here")]
    span: SourceSpan,
}

impl SyntaxDiagnostic {
    /// Creates a syntax diagnostic from error details.
    #[must_use]
    pub fn new(path: &Path, content: &str, line: usize, column: usize, message: String) -> Self {
        let offset = SourceContext::line_column_to_offset(content, line, column);
        let error_length = find_error_length(content, offset);

        Self {
            message,
            src: NamedSource::new(path.display().to_string(), content.to_string()),
            span: SourceSpan::new(offset.into(), error_length),
        }
    }
}

/// Diagnostic error for invalid decorator usage.
#[derive(Error, Debug, Diagnostic)]
#[error("Invalid @{decorator} decorator")]
#[diagnostic(
    code(nestjs_trpc::invalid_decorator),
    help("Decorators must be @Router, @Query, or @Mutation with valid arguments")
)]
pub struct DecoratorDiagnostic {
    pub decorator: String,

    #[source_code]
    src: NamedSource<String>,

    #[label("invalid decorator here")]
    span: SourceSpan,
}

impl DecoratorDiagnostic {
    /// Creates a decorator diagnostic from error details.
    #[must_use]
    pub fn new(
        path: &Path,
        content: &str,
        decorator: String,
        offset: usize,
        length: usize,
    ) -> Self {
        Self {
            decorator,
            src: NamedSource::new(path.display().to_string(), content.to_string()),
            span: SourceSpan::new(offset.into(), length),
        }
    }
}

/// Diagnostic error for unresolved imports.
#[derive(Error, Debug, Diagnostic)]
#[error("Cannot resolve import '{name}'")]
#[diagnostic(
    code(nestjs_trpc::unresolved_import),
    help("Check that the module exists and the import path is correct")
)]
pub struct ImportDiagnostic {
    pub name: String,

    #[source_code]
    src: NamedSource<String>,

    #[label("unresolved import")]
    span: SourceSpan,
}

impl ImportDiagnostic {
    /// Creates an import diagnostic from error details.
    #[must_use]
    pub fn new(path: &Path, content: &str, name: String, offset: usize, length: usize) -> Self {
        Self {
            name,
            src: NamedSource::new(path.display().to_string(), content.to_string()),
            span: SourceSpan::new(offset.into(), length),
        }
    }
}

/// Diagnostic error for missing @Router decorator.
#[derive(Error, Debug, Diagnostic)]
#[error("No @Router decorated classes found")]
#[diagnostic(
    code(nestjs_trpc::no_routers),
    help("Ensure your router classes are decorated with @Router from 'nestjs-trpc'")
)]
pub struct NoRoutersDiagnostic {
    pub searched_files: Vec<PathBuf>,
}

/// Diagnostic error for schema resolution failures.
#[derive(Error, Debug, Diagnostic)]
#[error("Cannot resolve schema '{name}'")]
#[diagnostic(
    code(nestjs_trpc::unresolved_schema),
    help("Ensure the schema variable is defined and exported")
)]
pub struct SchemaDiagnostic {
    pub name: String,

    #[source_code]
    src: NamedSource<String>,

    #[label("schema reference")]
    span: SourceSpan,
}

impl SchemaDiagnostic {
    /// Creates a schema diagnostic from error details.
    #[must_use]
    pub fn new(path: &Path, content: &str, name: String, offset: usize, length: usize) -> Self {
        Self {
            name,
            src: NamedSource::new(path.display().to_string(), content.to_string()),
            span: SourceSpan::new(offset.into(), length),
        }
    }
}

/// Finds a reasonable error length for highlighting.
/// Tries to highlight the token at the error position.
fn find_error_length(content: &str, offset: usize) -> usize {
    if offset >= content.len() {
        return 1;
    }

    let remaining = &content[offset..];
    let mut length = 0;

    for character in remaining.chars() {
        if character.is_whitespace() || character == ';' || character == ',' {
            break;
        }
        length += character.len_utf8();
        if length >= 20 {
            break;
        }
    }

    length.max(1)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_line_column_to_offset_first_line() {
        let content = "const x = 1;";
        let offset = SourceContext::line_column_to_offset(content, 1, 7);
        assert_eq!(offset, 6);
    }

    #[test]
    fn test_line_column_to_offset_second_line() {
        let content = "line one\nline two";
        let offset = SourceContext::line_column_to_offset(content, 2, 1);
        assert_eq!(offset, 9);
    }

    #[test]
    fn test_line_column_to_offset_middle_of_line() {
        let content = "first\nsecond\nthird";
        let offset = SourceContext::line_column_to_offset(content, 2, 4);
        assert_eq!(offset, 9);
    }

    #[test]
    fn test_find_error_length_word() {
        let content = "const invalid here";
        let length = find_error_length(content, 6);
        assert_eq!(length, 7);
    }

    #[test]
    fn test_find_error_length_at_end() {
        let content = "const";
        let length = find_error_length(content, 0);
        assert_eq!(length, 5);
    }

    #[test]
    fn test_syntax_diagnostic_creation() {
        let diagnostic = SyntaxDiagnostic::new(
            Path::new("test.ts"),
            "const x = {{\n",
            1,
            11,
            "Unexpected token".to_string(),
        );

        assert_eq!(diagnostic.message, "Unexpected token");
    }

    #[test]
    fn test_source_context_from_file() {
        let context = SourceContext::from_file(Path::new("test.ts"), "content here", 0, 7);

        assert_eq!(context.span.offset(), 0);
        assert_eq!(context.span.len(), 7);
    }

    #[test]
    fn test_decorator_diagnostic_creation() {
        let diagnostic = DecoratorDiagnostic::new(
            Path::new("router.ts"),
            "@InvalidDecorator\nclass Test {}",
            "InvalidDecorator".to_string(),
            1,
            16,
        );

        assert_eq!(diagnostic.decorator, "InvalidDecorator");
    }

    #[test]
    fn test_import_diagnostic_creation() {
        let diagnostic = ImportDiagnostic::new(
            Path::new("file.ts"),
            "import { Missing } from './missing';",
            "Missing".to_string(),
            9,
            7,
        );

        assert_eq!(diagnostic.name, "Missing");
    }

    #[test]
    fn test_schema_diagnostic_creation() {
        let diagnostic = SchemaDiagnostic::new(
            Path::new("schema.ts"),
            "const schema = unknownSchema;",
            "unknownSchema".to_string(),
            15,
            13,
        );

        assert_eq!(diagnostic.name, "unknownSchema");
    }
}
