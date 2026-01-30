use miette::Diagnostic;
use std::path::PathBuf;
use thiserror::Error;

#[derive(Error, Debug, Diagnostic)]
pub enum CliError {
    #[error(transparent)]
    #[diagnostic(transparent)]
    Config(#[from] ConfigError),

    #[error(transparent)]
    #[diagnostic(transparent)]
    Scanner(#[from] ScannerError),

    #[error(transparent)]
    #[diagnostic(transparent)]
    Parser(#[from] ParserError),

    #[error(transparent)]
    #[diagnostic(transparent)]
    Import(#[from] ImportError),

    #[error(transparent)]
    #[diagnostic(transparent)]
    Generator(#[from] GeneratorError),

    #[error("I/O error: {0}")]
    #[diagnostic(code(nestjs_trpc::io_error))]
    Io(#[from] std::io::Error),
}

#[derive(Error, Debug, Diagnostic)]
#[diagnostic(code(nestjs_trpc::config_error))]
pub enum ConfigError {
    #[error("Configuration file not found at '{path}'. Run `nestjs-trpc init` to create one.")]
    #[diagnostic(help(
        "Create a configuration file or use --entrypoint to specify the module path"
    ))]
    NotFound { path: PathBuf },

    #[error("Failed to read configuration file '{path}': {source}")]
    ReadFailed {
        path: PathBuf,
        #[source]
        source: std::io::Error,
    },

    #[error("Invalid configuration syntax in '{path}': {message}")]
    #[diagnostic(help("Check the configuration file for JSON/TypeScript syntax errors"))]
    InvalidSyntax { path: PathBuf, message: String },

    #[error("Missing required configuration field '{field}' in '{path}'")]
    #[diagnostic(help("Add the required field to your configuration file"))]
    MissingField { path: PathBuf, field: String },

    #[error("Invalid value for '{field}' in '{path}': {message}")]
    InvalidValue {
        path: PathBuf,
        field: String,
        message: String,
    },

    #[error("Could not find TRPCModule.forRoot() in any of the following locations:\n{}", .searched_paths.iter().map(|p| format!("  - {}", p.display())).collect::<Vec<_>>().join("\n"))]
    #[diagnostic(help("Use --entrypoint to specify the path to your NestJS module containing TRPCModule.forRoot()"))]
    ModuleNotFound { searched_paths: Vec<PathBuf> },
}

#[derive(Error, Debug, Diagnostic)]
#[diagnostic(code(nestjs_trpc::scanner_error))]
pub enum ScannerError {
    #[error("Invalid glob pattern '{0}': {1}")]
    #[diagnostic(help("Check the glob pattern syntax (e.g., '**/*.router.ts')"))]
    InvalidPattern(String, String),

    #[error("Directory not found: '{0}'")]
    #[diagnostic(help("Verify the directory path exists"))]
    DirectoryNotFound(PathBuf),

    #[error("Path is not a directory: '{0}'")]
    NotADirectory(PathBuf),

    #[error("No router files found matching pattern '{pattern}' in '{root}'")]
    #[diagnostic(help("Check that your router files exist and match the pattern"))]
    NoFilesFound { pattern: String, root: PathBuf },

    #[error("I/O error reading '{0}': {1}")]
    IoError(PathBuf, String),

    #[error("Failed to read directory entry in '{path}': {source}")]
    ReadFailed {
        path: PathBuf,
        #[source]
        source: std::io::Error,
    },
}

#[derive(Error, Debug, Diagnostic)]
#[diagnostic(code(nestjs_trpc::parser_error))]
pub enum ParserError {
    #[error("Failed to read source file '{path}': {source}")]
    ReadFailed {
        path: PathBuf,
        #[source]
        source: std::io::Error,
    },

    #[error("Syntax error in '{path}' at line {line}, column {column}: {message}")]
    #[diagnostic(help("Check for missing semicolons, brackets, or invalid TypeScript syntax"))]
    SyntaxError {
        path: PathBuf,
        line: usize,
        column: usize,
        message: String,
    },

    #[error("Class '{class_name}' in '{path}' is missing @Router decorator")]
    #[diagnostic(help("Add @Router decorator from 'nestjs-trpc' to your router class"))]
    MissingRouterDecorator { path: PathBuf, class_name: String },

    #[error("Invalid decorator arguments for @{decorator} in '{path}': {message}")]
    #[diagnostic(help("Check the decorator syntax and arguments"))]
    InvalidDecoratorArgs {
        path: PathBuf,
        decorator: String,
        message: String,
    },

    #[error("Unsupported AST node type in '{path}': {node_type}")]
    UnsupportedNode { path: PathBuf, node_type: String },
}

#[derive(Error, Debug, Diagnostic)]
#[diagnostic(code(nestjs_trpc::import_error))]
pub enum ImportError {
    #[error("Circular import detected: {cycle}")]
    #[diagnostic(help("Refactor to break the circular dependency"))]
    CircularImport { cycle: String },

    #[error("Cannot resolve import '{name}' from '{source_path}'")]
    #[diagnostic(help("Check that the module exists and the import path is correct"))]
    Unresolved { name: String, source_path: PathBuf },

    #[error("Failed to resolve '{name}' through barrel file '{barrel}': {message}")]
    BarrelResolutionFailed {
        name: String,
        barrel: PathBuf,
        message: String,
    },

    #[error("Module not found: '{module}' imported from '{source_path}'")]
    #[diagnostic(help("Verify the module path and that the file exists"))]
    ModuleNotFound {
        module: String,
        source_path: PathBuf,
    },
}

#[derive(Error, Debug, Diagnostic)]
#[diagnostic(code(nestjs_trpc::generator_error))]
pub enum GeneratorError {
    #[error("Failed to create output directory '{path}': {source}")]
    CreateDirFailed {
        path: PathBuf,
        #[source]
        source: std::io::Error,
    },

    #[error("Failed to write output file '{path}': {source}")]
    WriteFailed {
        path: PathBuf,
        #[source]
        source: std::io::Error,
    },

    #[error("No routers found to generate. Check your router_pattern configuration.")]
    #[diagnostic(help(
        "Ensure your router classes are decorated with @Router from 'nestjs-trpc'"
    ))]
    NoRouters,

    #[error("Failed to flatten Zod schema '{schema}' in '{path}': {message}")]
    SchemaFlattenFailed {
        path: PathBuf,
        schema: String,
        message: String,
    },

    #[error("Unresolved schema reference '{name}' in '{path}'. The variable was not found.")]
    #[diagnostic(help("Ensure the schema variable is defined and exported"))]
    UnresolvedSchema { path: PathBuf, name: String },
}

pub type Result<T> = std::result::Result<T, CliError>;

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_config_not_found_error() {
        let err = ConfigError::NotFound {
            path: PathBuf::from("nestjs-trpc.toml"),
        };
        let message = err.to_string();
        assert!(message.contains("nestjs-trpc.toml"));
        assert!(message.contains("nestjs-trpc init"));
    }

    #[test]
    fn test_parser_syntax_error() {
        let err = ParserError::SyntaxError {
            path: PathBuf::from("user.router.ts"),
            line: 10,
            column: 5,
            message: "Unexpected token".to_string(),
        };
        let message = err.to_string();
        assert!(message.contains("user.router.ts"));
        assert!(message.contains("line 10"));
        assert!(message.contains("column 5"));
    }

    #[test]
    fn test_circular_import_error() {
        let err = ImportError::CircularImport {
            cycle: "a.ts -> b.ts -> c.ts -> a.ts".to_string(),
        };
        let message = err.to_string();
        assert!(message.contains("Circular import"));
        assert!(message.contains("a.ts -> b.ts -> c.ts -> a.ts"));
    }

    #[test]
    fn test_error_chaining() {
        let io_err = std::io::Error::new(std::io::ErrorKind::NotFound, "file not found");
        let parser_err = ParserError::ReadFailed {
            path: PathBuf::from("test.ts"),
            source: io_err,
        };
        let cli_err = CliError::from(parser_err);

        // Verify error chain works
        assert!(cli_err.to_string().contains("test.ts"));
    }

    #[test]
    fn test_scanner_no_files_found() {
        let err = ScannerError::NoFilesFound {
            pattern: "**/*.router.ts".to_string(),
            root: PathBuf::from("./src"),
        };
        let message = err.to_string();
        assert!(message.contains("**/*.router.ts"));
        assert!(message.contains("./src"));
    }

    #[test]
    fn test_generator_unresolved_schema() {
        let err = GeneratorError::UnresolvedSchema {
            path: PathBuf::from("user.router.ts"),
            name: "userSchema".to_string(),
        };
        let message = err.to_string();
        assert!(message.contains("userSchema"));
        assert!(message.contains("user.router.ts"));
        assert!(message.contains("not found"));
    }
}
