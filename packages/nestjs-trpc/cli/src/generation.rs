use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
use std::time::Instant;

use anyhow::{Context, Result};
use tracing::{debug, info, warn};

use crate::{
    build_imports_map, extract_procedures_from_class, DecoratorParser, FileScanner, ParsedFile,
    ParserError, RouterMetadata, RouterParser, ServerGenerator, SyntaxDiagnostic, TsParser,
};

/// Result of a generation operation
#[derive(Debug, Clone)]
pub struct GenerationResult {
    pub router_count: usize,
    pub procedure_count: usize,
    pub duration_milliseconds: u64,
}

/// Core generation logic that can be called from both CLI and watch mode.
/// Returns router count, procedure count, and duration in milliseconds.
pub fn run_generation(
    base_directory: &Path,
    output_path: &Path,
    router_pattern: &str,
) -> Result<GenerationResult> {
    let start_time = Instant::now();

    let router_files = scan_router_files(base_directory, router_pattern)?;
    let (typescript_parser, parsed_files) = parse_router_files(&router_files)?;
    let routers = extract_routers(&parsed_files)?;
    let schema_locations =
        build_schema_locations(&typescript_parser, &parsed_files, base_directory);
    write_server_file(output_path, &routers, &schema_locations)?;

    let router_count = routers.len();
    let procedure_count = routers.iter().map(|r| r.procedures.len()).sum();
    // u128 millis won't overflow u64 for any realistic program lifetime (584 million years)
    #[allow(clippy::cast_possible_truncation)]
    let duration_milliseconds = start_time.elapsed().as_millis() as u64;

    Ok(GenerationResult {
        router_count,
        procedure_count,
        duration_milliseconds,
    })
}

fn scan_router_files(base_directory: &Path, pattern: &str) -> Result<Vec<PathBuf>> {
    let scanner = FileScanner::new(base_directory).with_context(|| {
        format!(
            "Failed to initialize scanner for '{}'",
            base_directory.display()
        )
    })?;

    let router_files = scanner
        .scan(pattern)
        .with_context(|| format!("Failed to scan for router files with pattern '{pattern}'"))?;

    if router_files.is_empty() {
        anyhow::bail!(
            "No router files found matching pattern '{pattern}' in '{}'.\n\
            Check that your router files exist and match the pattern.",
            base_directory.display()
        );
    }

    info!(
        count = router_files.len(),
        pattern = %pattern,
        "Found router files"
    );

    for file in &router_files {
        debug!(file = ?file, "Found router file");
    }

    Ok(router_files)
}

fn parse_router_files(router_files: &[PathBuf]) -> Result<(TsParser, Vec<ParsedFile>)> {
    let typescript_parser = TsParser::new();
    let (parsed_files, parse_errors) = typescript_parser.parse_files(router_files);

    for error in &parse_errors {
        print_parse_error(error);
    }

    if parsed_files.is_empty() {
        anyhow::bail!(
            "Failed to parse any router files. {} files had syntax errors.",
            parse_errors.len()
        );
    }

    info!(
        parsed = parsed_files.len(),
        errors = parse_errors.len(),
        "Parsed TypeScript files"
    );

    Ok((typescript_parser, parsed_files))
}

fn print_parse_error(error: &ParserError) {
    if let ParserError::SyntaxError {
        path,
        line,
        column,
        message,
    } = error
    {
        if let Ok(content) = fs::read_to_string(path) {
            let diagnostic = SyntaxDiagnostic::new(path, &content, *line, *column, message.clone());
            let report = miette::Report::new(diagnostic);
            eprintln!("{report:?}");
            return;
        }
    }

    warn!("Parse error: {}", error);
}

fn extract_routers(parsed_files: &[ParsedFile]) -> Result<Vec<RouterMetadata>> {
    let router_parser = RouterParser::new();
    let decorator_parser = DecoratorParser::new();

    let mut routers: Vec<RouterMetadata> = Vec::new();

    for parsed_file in parsed_files {
        let router_infos = router_parser.extract_routers(parsed_file);

        for router_info in router_infos {
            let procedures = extract_procedures_from_class(
                parsed_file,
                &router_info.class_name,
                &decorator_parser,
            );

            let router_metadata = RouterMetadata {
                name: router_info.class_name,
                alias: router_info.alias,
                file_path: router_info.file_path,
                procedures,
            };

            debug!(
                router = %router_metadata.name,
                alias = ?router_metadata.alias,
                procedures = router_metadata.procedures.len(),
                "Extracted router metadata"
            );

            routers.push(router_metadata);
        }
    }

    if routers.is_empty() {
        anyhow::bail!(
            "No @Router decorated classes found in {} parsed files.\n\
            Ensure your router classes are decorated with @Router from 'nestjs-trpc'.",
            parsed_files.len()
        );
    }

    info!(
        routers = routers.len(),
        total_procedures = routers.iter().map(|r| r.procedures.len()).sum::<usize>(),
        "Extracted router metadata"
    );

    Ok(routers)
}

fn build_schema_locations(
    typescript_parser: &TsParser,
    parsed_files: &[ParsedFile],
    base_directory: &Path,
) -> HashMap<String, PathBuf> {
    let mut schema_locations = HashMap::new();

    for parsed_file in parsed_files {
        add_imports_from_file(
            &mut schema_locations,
            typescript_parser,
            parsed_file,
            base_directory,
        );
    }

    debug!(
        schema_count = schema_locations.len(),
        "Built schema locations map"
    );

    schema_locations
}

fn add_imports_from_file(
    schema_locations: &mut HashMap<String, PathBuf>,
    typescript_parser: &TsParser,
    parsed_file: &ParsedFile,
    base_directory: &Path,
) {
    let imports_map = match build_imports_map(typescript_parser, parsed_file, base_directory) {
        Ok(map) => map,
        Err(error) => {
            warn!(
                "Failed to build imports map for {:?}: {}",
                parsed_file.file_path, error
            );
            return;
        }
    };

    for (name, resolved) in imports_map {
        schema_locations.insert(name, resolved.source_file);
    }
}

fn write_server_file(
    output_path: &Path,
    routers: &[RouterMetadata],
    schema_locations: &HashMap<String, PathBuf>,
) -> Result<PathBuf> {
    let server_generator = ServerGenerator::new();

    let server_file_path = if output_path
        .extension()
        .is_some_and(|ext| ext == "ts" || ext == "tsx")
    {
        output_path.to_path_buf()
    } else {
        output_path.join("server.ts")
    };
    let server_content =
        server_generator.generate_with_schema_imports(routers, schema_locations, &server_file_path);

    debug!(
        content_length = server_content.len(),
        "Generated server.ts content"
    );

    if let Some(parent) = server_file_path.parent() {
        fs::create_dir_all(parent)
            .with_context(|| format!("Failed to create output directory '{}'", parent.display()))?;
    }

    fs::write(&server_file_path, &server_content).with_context(|| {
        format!(
            "Failed to write generated file to '{}'",
            server_file_path.display()
        )
    })?;

    info!(output = %server_file_path.display(), "Generated server.ts");

    Ok(server_file_path)
}
