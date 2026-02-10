// False positives from thiserror/miette derive macros - struct fields are used
// via string interpolation in #[error(...)] and diagnostic attributes
#![allow(unused_assignments)]

pub mod config;
pub mod diagnostic;
pub mod discovery;
pub mod error;
pub mod generation;
pub mod generator;
pub mod parser;
pub mod scanner;
pub mod validation;
pub mod watcher;

pub use anyhow::Result;
pub use config::{Config, GenerationConfig, ParsingConfig};
pub use diagnostic::{
    DecoratorDiagnostic, ImportDiagnostic, NoRoutersDiagnostic, SchemaDiagnostic, SourceContext,
    SyntaxDiagnostic,
};
pub use discovery::discover_root_module;
pub use error::{CliError, ConfigError, GeneratorError, ImportError, ParserError, ScannerError};
pub use generation::{run_generation, GenerationResult};
pub use generator::{
    generate_server_file, generate_static_section, generate_types_file, ServerGenerator,
    StaticGenerator, TypesGenerator,
};
pub use parser::imports::{build_imports_map, DeclarationType, ImportResolver, ResolvedImport};
pub use parser::procedure::extract_procedures_from_class;
pub use parser::{
    extract_context, extract_middleware, extract_middleware_names_from_class, extract_routers,
    extract_trpc_options, flatten_zod_schema, is_procedure_decorator, parse_typescript_file,
    parse_typescript_source, resolve_context_file, resolve_transformer_import, ContextInfo,
    ContextParser, ContextProperty, DecoratorParser, MiddlewareInfo, MiddlewareParser,
    ModuleParser, ParsedFile, ProcedureDecoratorInfo, RouterInfo, RouterParser, TransformerInfo,
    TrpcModuleOptions, TsParser, ZodFlattener, ZodResult,
};
pub use scanner::{scan_for_routers, FileScanner};
pub use validation::{
    compute_diff, find_tsc, run_tsc_validation, DiffResult, TscError, TscResult, TscSeverity,
};
pub use watcher::{WatchConfig, WatchSession};

#[derive(Debug, Clone)]
pub struct RouterMetadata {
    pub name: String,
    pub alias: Option<String>,
    pub file_path: std::path::PathBuf,
    pub procedures: Vec<ProcedureMetadata>,
}

#[derive(Debug, Clone)]
pub struct ProcedureMetadata {
    pub name: String,
    pub procedure_type: ProcedureType,
    pub input_schema: Option<String>,
    pub output_schema: Option<String>,
    pub input_schema_ref: Option<String>,
    pub output_schema_ref: Option<String>,
    pub schema_identifiers: Vec<String>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ProcedureType {
    Query,
    Mutation,
}

impl std::fmt::Display for ProcedureType {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Query => write!(f, "query"),
            Self::Mutation => write!(f, "mutation"),
        }
    }
}
