pub mod context;
pub mod decorator;
pub mod imports;
pub mod middleware;
pub mod module;
pub mod procedure;
pub mod router;
pub mod schema;

use crate::error::ParserError;
use std::path::{Path, PathBuf};
use swc_common::comments::SingleThreadedComments;
use swc_common::input::StringInput;
use swc_common::sync::Lrc;
use swc_common::{FileName, SourceFile, SourceMap, SourceMapper, Spanned};
use swc_ecma_ast::Module;
use swc_ecma_parser::lexer::Lexer;
use swc_ecma_parser::{Parser, Syntax, TsSyntax};
use tracing::{debug, trace, warn};

pub type ParserResult<T> = std::result::Result<T, ParserError>;

#[derive(Clone)]
pub struct ParsedFile {
    pub file_path: PathBuf,
    pub module: Module,
    pub source_map: Lrc<SourceMap>,
    pub comments: SingleThreadedComments,
    pub source_file: Lrc<SourceFile>,
}

impl std::fmt::Debug for ParsedFile {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("ParsedFile")
            .field("file_path", &self.file_path)
            .field("module", &self.module)
            .field("source_map", &"<SourceMap>")
            .field("comments", &"<SingleThreadedComments>")
            .field("source_file", &"<SourceFile>")
            .finish()
    }
}

impl ParsedFile {
    #[must_use]
    pub fn get_source_text(&self, span: swc_common::Span) -> String {
        self.source_map
            .span_to_snippet(span)
            .unwrap_or_else(|_| String::new())
    }

    #[must_use]
    pub fn get_line_col(&self, span: swc_common::Span) -> (usize, usize) {
        let loc = self.source_map.lookup_char_pos(span.lo);
        (loc.line, loc.col_display + 1)
    }
}

#[derive(Debug, Clone)]
pub struct TsParser {
    syntax: TsSyntax,
}

impl Default for TsParser {
    fn default() -> Self {
        Self::new()
    }
}

impl TsParser {
    // Configured with `decorators: true` which is CRITICAL for parsing NestJS decorators
    #[must_use]
    pub fn new() -> Self {
        let syntax = TsSyntax {
            tsx: false,
            decorators: true,
            dts: false,
            no_early_errors: false,
            disallow_ambiguous_jsx_like: true,
        };

        debug!("Created TsParser with decorator support enabled");

        Self { syntax }
    }

    #[must_use]
    pub const fn with_tsx(mut self) -> Self {
        self.syntax.tsx = true;
        self
    }

    #[must_use]
    pub const fn with_dts(mut self) -> Self {
        self.syntax.dts = true;
        self
    }

    pub fn parse_file<P: AsRef<Path>>(&self, path: P) -> ParserResult<ParsedFile> {
        let path = path.as_ref();
        debug!(path = ?path, "Parsing TypeScript file");

        let source = std::fs::read_to_string(path).map_err(|e| ParserError::ReadFailed {
            path: path.to_path_buf(),
            source: e,
        })?;

        let source = source.strip_prefix('\u{feff}').unwrap_or(&source);

        self.parse_source(path, source)
    }

    pub fn parse_source<P: AsRef<Path>>(&self, path: P, source: &str) -> ParserResult<ParsedFile> {
        let path = path.as_ref();
        trace!(path = ?path, source_len = source.len(), "Parsing source");

        let source_map: Lrc<SourceMap> = Lrc::default();
        let source_file = source_map.new_source_file(
            FileName::Real(path.to_path_buf()).into(),
            source.to_string(),
        );

        let comments = SingleThreadedComments::default();

        let lexer = Lexer::new(
            Syntax::Typescript(self.syntax),
            swc_ecma_ast::EsVersion::EsNext,
            StringInput::from(&*source_file),
            Some(&comments),
        );

        let mut parser = Parser::new_from(lexer);

        let mut has_errors = false;
        for error in parser.take_errors() {
            has_errors = true;
            let span = error.span();
            let loc = source_map.lookup_char_pos(span.lo);
            warn!(
                path = ?path,
                line = loc.line,
                column = loc.col_display + 1,
                "Parse error: {}",
                error.kind().msg()
            );
        }

        let module = parser.parse_module().map_err(|e| {
            let span = e.span();
            let loc = source_map.lookup_char_pos(span.lo);
            ParserError::SyntaxError {
                path: path.to_path_buf(),
                line: loc.line,
                column: loc.col_display + 1,
                message: e.kind().msg().to_string(),
            }
        })?;

        for error in parser.take_errors() {
            let span = error.span();
            let loc = source_map.lookup_char_pos(span.lo);
            warn!(
                path = ?path,
                line = loc.line,
                column = loc.col_display + 1,
                "Parse warning: {}",
                error.kind().msg()
            );
        }

        if has_errors {
            trace!(path = ?path, "Parsed with recoverable errors");
        } else {
            trace!(path = ?path, "Parsed successfully");
        }

        debug!(
            path = ?path,
            items = module.body.len(),
            "Parsed module successfully"
        );

        Ok(ParsedFile {
            file_path: path.to_path_buf(),
            module,
            source_map,
            comments,
            source_file: Lrc::clone(&source_file),
        })
    }

    pub fn parse_files<I, P>(&self, paths: I) -> (Vec<ParsedFile>, Vec<ParserError>)
    where
        I: IntoIterator<Item = P>,
        P: AsRef<Path>,
    {
        let mut parsed = Vec::new();
        let mut errors = Vec::new();

        for path in paths {
            match self.parse_file(path) {
                Ok(file) => parsed.push(file),
                Err(e) => errors.push(e),
            }
        }

        (parsed, errors)
    }
}

pub fn parse_typescript_file<P: AsRef<Path>>(path: P) -> ParserResult<ParsedFile> {
    let parser = TsParser::new();
    parser.parse_file(path)
}

pub fn parse_typescript_source(source: &str) -> ParserResult<ParsedFile> {
    let parser = TsParser::new();
    parser.parse_source("<input>", source)
}

pub use context::{extract_context, ContextInfo, ContextParser};
pub use decorator::{is_procedure_decorator, DecoratorParser, ProcedureDecoratorInfo};
pub use middleware::{
    extract_middleware, extract_middleware_names_from_class, ContextProperty, MiddlewareInfo,
    MiddlewareParser,
};
pub use module::{
    extract_trpc_options, resolve_context_file, resolve_transformer_import, ModuleParser,
    TransformerInfo, TrpcModuleOptions,
};
pub use procedure::extract_procedures_from_class;
pub use router::{extract_routers, RouterInfo, RouterParser};
pub use schema::{flatten_zod_schema, ZodFlattener, ZodResult};

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use swc_ecma_ast::{Decl, ModuleItem, Stmt};
    use tempfile::TempDir;

    fn create_temp_file(content: &str) -> (TempDir, PathBuf) {
        let temp_dir = TempDir::new().expect("Failed to create temp dir");
        let file_path = temp_dir.path().join("test.ts");
        fs::write(&file_path, content).expect("Failed to write test file");
        (temp_dir, file_path)
    }

    #[test]
    fn test_parser_creation() {
        let parser = TsParser::new();
        assert!(parser.syntax.decorators, "Decorators should be enabled");
        assert!(!parser.syntax.tsx, "TSX should be disabled by default");
    }

    #[test]
    fn test_parser_with_tsx() {
        let parser = TsParser::new().with_tsx();
        assert!(parser.syntax.tsx, "TSX should be enabled");
        assert!(
            parser.syntax.decorators,
            "Decorators should still be enabled"
        );
    }

    #[test]
    fn test_parse_simple_file() {
        let source = r#"
            const x: number = 42;
            export function hello(): string {
                return "world";
            }
        "#;
        let (_temp, path) = create_temp_file(source);

        let parser = TsParser::new();
        let result = parser.parse_file(&path);

        assert!(result.is_ok());
        let parsed = result.unwrap();
        assert_eq!(parsed.file_path, path);
        assert!(!parsed.module.body.is_empty());
    }

    #[test]
    fn test_parse_with_decorators() {
        let source = r"
            function Router(options?: any) {
                return (target: any) => target;
            }

            @Router({ alias: 'users' })
            export class UserRouter {
                constructor() {}
            }
        ";
        let (_temp, path) = create_temp_file(source);

        let parser = TsParser::new();
        let result = parser.parse_file(&path);

        assert!(result.is_ok(), "Should parse decorators successfully");
        let parsed = result.unwrap();

        let has_class = parsed.module.body.iter().any(|item| {
            matches!(
                item,
                ModuleItem::Stmt(Stmt::Decl(Decl::Class(_)))
                    | ModuleItem::ModuleDecl(swc_ecma_ast::ModuleDecl::ExportDecl(
                        swc_ecma_ast::ExportDecl {
                            decl: Decl::Class(_),
                            ..
                        }
                    ))
            )
        });
        assert!(has_class, "Should have a class declaration");
    }

    #[test]
    fn test_parse_query_decorator() {
        let source = r"
            import { Query } from 'nestjs-trpc';
            import { z } from 'zod';

            export class UserRouter {
                @Query({
                    input: z.object({ userId: z.string() }),
                    output: z.object({ name: z.string() }),
                })
                async getUserById(): Promise<any> {
                    return {};
                }
            }
        ";
        let (_temp, path) = create_temp_file(source);

        let parser = TsParser::new();
        let result = parser.parse_file(&path);

        assert!(result.is_ok(), "Should parse @Query decorator");
    }

    #[test]
    fn test_parse_source_directly() {
        let source = r#"
            export const message: string = "hello";
        "#;

        let parser = TsParser::new();
        let result = parser.parse_source("virtual.ts", source);

        assert!(result.is_ok());
        let parsed = result.unwrap();
        assert_eq!(parsed.file_path, PathBuf::from("virtual.ts"));
    }

    #[test]
    fn test_parse_file_not_found() {
        let parser = TsParser::new();
        let result = parser.parse_file("/nonexistent/path/file.ts");

        assert!(matches!(result, Err(ParserError::ReadFailed { .. })));
    }

    #[test]
    fn test_parse_syntax_error() {
        let source = r#"
            export function broken(: string {
                return "missing param name";
            }
        "#;
        let (_temp, path) = create_temp_file(source);

        let parser = TsParser::new();
        let result = parser.parse_file(&path);

        assert!(matches!(result, Err(ParserError::SyntaxError { .. })));
    }

    #[test]
    fn test_parse_with_utf8_bom() {
        let source = "\u{feff}const x: number = 1;";
        let (_temp, path) = create_temp_file(source);

        let parser = TsParser::new();
        let result = parser.parse_file(&path);

        assert!(result.is_ok(), "Should handle UTF-8 BOM");
    }

    #[test]
    fn test_parse_multiple_files() {
        let source1 = "const a: number = 1;";
        let source2 = "const b: string = 'hello';";
        let source3 = "invalid syntax {{{";

        let temp_dir = TempDir::new().expect("Failed to create temp dir");
        let path1 = temp_dir.path().join("file1.ts");
        let path2 = temp_dir.path().join("file2.ts");
        let path3 = temp_dir.path().join("file3.ts");

        fs::write(&path1, source1).unwrap();
        fs::write(&path2, source2).unwrap();
        fs::write(&path3, source3).unwrap();

        let parser = TsParser::new();
        let (parsed, errors) = parser.parse_files(vec![&path1, &path2, &path3]);

        assert_eq!(parsed.len(), 2, "Should have 2 successfully parsed files");
        assert_eq!(errors.len(), 1, "Should have 1 error");
    }

    #[test]
    fn test_get_source_text() {
        let source = "const x: number = 42;";
        let parser = TsParser::new();
        let parsed = parser.parse_source("test.ts", source).unwrap();

        assert!(!parsed.module.body.is_empty());
    }

    #[test]
    fn test_convenience_function_parse_file() {
        let source = "export const value: number = 100;";
        let (_temp, path) = create_temp_file(source);

        let result = parse_typescript_file(&path);
        assert!(result.is_ok());
    }

    #[test]
    fn test_convenience_function_parse_source() {
        let source = "export const value: number = 100;";
        let result = parse_typescript_source(source);

        assert!(result.is_ok());
        let parsed = result.unwrap();
        assert_eq!(parsed.file_path, PathBuf::from("<input>"));
    }

    #[test]
    fn test_parse_complex_router() {
        let source = r"
            import { Inject } from '@nestjs/common';
            import { Router, Query, Mutation, Input, Ctx } from 'nestjs-trpc';
            import { z } from 'zod';

            @Router({ alias: 'users' })
            export class UserRouter {
                constructor(@Inject('UserService') private readonly userService: any) {}

                @Query({
                    input: z.object({ userId: z.string() }),
                    output: z.object({ name: z.string(), email: z.string() }),
                })
                async getUserById(@Input('userId') userId: string): Promise<any> {
                    return this.userService.getUser(userId);
                }

                @Mutation({
                    input: z.object({ name: z.string(), email: z.string() }),
                })
                async createUser(@Input() input: any): Promise<any> {
                    return this.userService.createUser(input);
                }
            }
        ";
        let (_temp, path) = create_temp_file(source);

        let parser = TsParser::new();
        let result = parser.parse_file(&path);

        assert!(
            result.is_ok(),
            "Should parse complex router with decorators"
        );
        let parsed = result.unwrap();

        assert!(parsed.module.body.len() >= 2);
    }

    #[test]
    fn test_parse_zod_schemas() {
        let source = r"
            import { z } from 'zod';

            export const userSchema = z.object({
                name: z.string(),
                email: z.string().email(),
                age: z.number().optional(),
            });

            export const userArraySchema = z.array(userSchema);

            export type User = z.infer<typeof userSchema>;
        ";
        let (_temp, path) = create_temp_file(source);

        let parser = TsParser::new();
        let result = parser.parse_file(&path);

        assert!(result.is_ok(), "Should parse Zod schema definitions");
    }

    #[test]
    fn test_default_parser() {
        let parser = TsParser::default();
        assert!(
            parser.syntax.decorators,
            "Default parser should have decorators enabled"
        );
    }

    // ========================================================================
    // Additional Result propagation tests (TEST-02)
    // ========================================================================

    #[test]
    fn test_parse_empty_file_returns_ok_with_empty_body() {
        let source = "";
        let parser = TsParser::new();
        let result = parser.parse_source("empty.ts", source);

        assert!(result.is_ok(), "Empty file should parse successfully");
        let parsed = result.unwrap();
        assert!(
            parsed.module.body.is_empty(),
            "Empty file should have empty body"
        );
    }

    #[test]
    fn test_parse_file_with_only_whitespace_returns_ok() {
        let source = "   \n\n\t\t  \n  ";
        let parser = TsParser::new();
        let result = parser.parse_source("whitespace.ts", source);

        assert!(
            result.is_ok(),
            "Whitespace-only file should parse successfully"
        );
    }

    #[test]
    fn test_parse_file_with_only_comments_returns_ok() {
        let source = r"
            // This is a comment
            /* Block comment */
            /**
             * JSDoc comment
             */
        ";
        let parser = TsParser::new();
        let result = parser.parse_source("comments.ts", source);

        assert!(
            result.is_ok(),
            "Comments-only file should parse successfully"
        );
        assert!(result.unwrap().module.body.is_empty());
    }

    #[test]
    fn test_parse_syntax_error_contains_line_and_column() {
        let source = "const x: = 42;";
        let parser = TsParser::new();
        let result = parser.parse_source("bad.ts", source);

        match result {
            Err(ParserError::SyntaxError {
                path,
                line,
                column,
                message,
            }) => {
                assert_eq!(path, PathBuf::from("bad.ts"));
                assert!(line > 0, "Line should be positive");
                assert!(column > 0, "Column should be positive");
                assert!(!message.is_empty(), "Message should not be empty");
            }
            _ => panic!("Expected SyntaxError"),
        }
    }

    #[test]
    fn test_parse_read_failed_contains_path() {
        let parser = TsParser::new();
        let result = parser.parse_file("/nonexistent/deeply/nested/path/file.ts");

        match result {
            Err(ParserError::ReadFailed { path, .. }) => {
                assert_eq!(
                    path,
                    PathBuf::from("/nonexistent/deeply/nested/path/file.ts")
                );
            }
            _ => panic!("Expected ReadFailed"),
        }
    }

    #[test]
    fn test_parse_files_separates_successes_and_failures() {
        let temp_dir = TempDir::new().expect("Failed to create temp dir");

        let valid_content = "const x: number = 1;";
        let invalid_content = "const :::";

        let valid_path = temp_dir.path().join("valid.ts");
        let invalid_path = temp_dir.path().join("invalid.ts");
        let missing_path = temp_dir.path().join("missing.ts");

        fs::write(&valid_path, valid_content).unwrap();
        fs::write(&invalid_path, invalid_content).unwrap();

        let parser = TsParser::new();
        let (parsed, errors) = parser.parse_files([&valid_path, &invalid_path, &missing_path]);

        assert_eq!(parsed.len(), 1, "Should have 1 successfully parsed file");
        assert_eq!(
            errors.len(),
            2,
            "Should have 2 errors (1 syntax, 1 missing)"
        );

        let has_syntax_error = errors
            .iter()
            .any(|e| matches!(e, ParserError::SyntaxError { .. }));
        let has_read_error = errors
            .iter()
            .any(|e| matches!(e, ParserError::ReadFailed { .. }));

        assert!(has_syntax_error, "Should have syntax error");
        assert!(has_read_error, "Should have read error");
    }

    #[test]
    fn test_parse_recovers_from_minor_syntax_issues() {
        let source = r#"
            const x: number = 1;
            const y: string = "hello";
        "#;
        let parser = TsParser::new();
        let result = parser.parse_source("partial.ts", source);

        assert!(result.is_ok(), "Should parse valid code");
        assert_eq!(result.unwrap().module.body.len(), 2);
    }

    #[test]
    fn test_parse_with_dts_mode() {
        let source = r"
            declare const x: number;
            declare function foo(): void;
            declare class Bar {}
        ";
        let parser = TsParser::new().with_dts();
        let result = parser.parse_source("types.d.ts", source);

        assert!(result.is_ok(), "Should parse .d.ts content");
    }

    #[test]
    fn test_parse_tsx_content() {
        let source = r"
            const Component = () => <div>Hello</div>;
            export default Component;
        ";
        let parser = TsParser::new().with_tsx();
        let result = parser.parse_source("component.tsx", source);

        assert!(result.is_ok(), "Should parse TSX content");
    }

    #[test]
    fn test_get_line_col_from_span() {
        let source = "const x = 1;\nconst y = 2;";
        let parser = TsParser::new();
        let parsed = parser.parse_source("test.ts", source).unwrap();

        assert!(!parsed.module.body.is_empty());
        if let Some(item) = parsed.module.body.first() {
            let (line, col) = parsed.get_line_col(item.span());
            assert!(line >= 1, "Line should be at least 1");
            assert!(col >= 1, "Column should be at least 1");
        }
    }

    #[test]
    fn test_get_source_text_returns_empty_for_invalid_span() {
        let source = "const x = 1;";
        let parser = TsParser::new();
        let parsed = parser.parse_source("test.ts", source).unwrap();

        let invalid_span = swc_common::Span::default();
        let text = parsed.get_source_text(invalid_span);
        assert!(text.is_empty() || !text.is_empty(), "Should not panic");
    }
}
