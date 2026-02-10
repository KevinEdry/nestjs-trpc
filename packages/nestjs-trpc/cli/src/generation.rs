use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
use std::time::Instant;

use anyhow::{Context, Result};
use tracing::{debug, info, warn};

use crate::parser::decorator::collect_schema_identifiers;
use crate::{
    build_imports_map, extract_procedures_from_class, flatten_zod_schema, DecoratorParser,
    FileScanner, ParsedFile, ParserError, ProcedureMetadata, RouterMetadata, RouterParser,
    ServerGenerator, SyntaxDiagnostic, TsParser,
};
use std::collections::HashSet;
use swc_ecma_ast::{Decl, ModuleDecl, ModuleItem, Stmt};

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
    let mut routers = extract_routers(&parsed_files)?;
    let schema_locations =
        build_schema_locations(&typescript_parser, &parsed_files, base_directory);
    flatten_unimportable_schemas(
        &mut routers,
        &schema_locations,
        &typescript_parser,
        &parsed_files,
        base_directory,
    );
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
        add_external_imports_from_file(&mut schema_locations, parsed_file);
        add_exported_declarations_from_file(&mut schema_locations, parsed_file);
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

fn add_external_imports_from_file(
    schema_locations: &mut HashMap<String, PathBuf>,
    parsed_file: &ParsedFile,
) {
    for item in &parsed_file.module.body {
        let ModuleItem::ModuleDecl(ModuleDecl::Import(import_declaration)) = item else {
            continue;
        };

        let module_specifier = import_declaration.src.value.to_string_lossy().into_owned();
        if module_specifier.starts_with('.') || module_specifier.starts_with('/') {
            continue;
        }

        add_named_import_specifiers(schema_locations, import_declaration, &module_specifier);
    }
}

fn add_named_import_specifiers(
    schema_locations: &mut HashMap<String, PathBuf>,
    import_declaration: &swc_ecma_ast::ImportDecl,
    module_specifier: &str,
) {
    for specifier in &import_declaration.specifiers {
        let swc_ecma_ast::ImportSpecifier::Named(named) = specifier else {
            continue;
        };
        let local_name = named.local.sym.to_string();
        schema_locations
            .entry(local_name)
            .or_insert_with(|| PathBuf::from(module_specifier));
    }
}

fn add_exported_declarations_from_file(
    schema_locations: &mut HashMap<String, PathBuf>,
    parsed_file: &ParsedFile,
) {
    for item in &parsed_file.module.body {
        let ModuleItem::ModuleDecl(ModuleDecl::ExportDecl(export)) = item else {
            continue;
        };
        let Decl::Var(variable_declaration) = &export.decl else {
            continue;
        };

        add_variable_declarator_names(
            schema_locations,
            variable_declaration,
            &parsed_file.file_path,
        );
    }
}

fn add_variable_declarator_names(
    schema_locations: &mut HashMap<String, PathBuf>,
    variable_declaration: &swc_ecma_ast::VarDecl,
    file_path: &Path,
) {
    for declarator in &variable_declaration.decls {
        let swc_ecma_ast::Pat::Ident(identifier) = &declarator.name else {
            continue;
        };
        let name = identifier.id.sym.to_string();
        schema_locations
            .entry(name)
            .or_insert_with(|| file_path.to_path_buf());
    }
}

fn flatten_unimportable_schemas(
    routers: &mut [RouterMetadata],
    schema_locations: &HashMap<String, PathBuf>,
    typescript_parser: &TsParser,
    parsed_files: &[ParsedFile],
    base_directory: &Path,
) {
    let importable_identifiers: HashSet<String> = schema_locations.keys().cloned().collect();

    for router in routers.iter_mut() {
        let Some(source_file) = find_parsed_file(parsed_files, &router.file_path) else {
            continue;
        };

        for procedure in &mut router.procedures {
            flatten_procedure_schemas(
                procedure,
                typescript_parser,
                source_file,
                base_directory,
                &importable_identifiers,
            );
        }
    }
}

fn flatten_procedure_schemas(
    procedure: &mut ProcedureMetadata,
    typescript_parser: &TsParser,
    source_file: &ParsedFile,
    base_directory: &Path,
    importable_identifiers: &HashSet<String>,
) {
    let input_changed = try_flatten_schema(
        &mut procedure.input_schema,
        &mut procedure.input_schema_ref,
        typescript_parser,
        source_file,
        base_directory,
        importable_identifiers,
    );

    let output_changed = try_flatten_schema(
        &mut procedure.output_schema,
        &mut procedure.output_schema_ref,
        typescript_parser,
        source_file,
        base_directory,
        importable_identifiers,
    );

    // Resolve remaining unimportable identifiers nested within inline schemas.
    // The flattener handles top-level refs correctly but can't resolve identifiers
    // embedded in inline expressions due to span misalignment between the temporary
    // parse and the original source file.
    let unimportable: Vec<_> = procedure
        .schema_identifiers
        .iter()
        .filter(|identifier| !importable_identifiers.contains(identifier.as_str()))
        .cloned()
        .collect();

    let mut inner_changed = false;
    for identifier in &unimportable {
        if resolve_and_replace_identifier(
            &mut procedure.input_schema,
            &mut procedure.output_schema,
            identifier,
            typescript_parser,
            source_file,
            base_directory,
            importable_identifiers,
        ) {
            inner_changed = true;
        }
    }

    if input_changed || output_changed || inner_changed {
        recollect_schema_identifiers(procedure, typescript_parser);
    }
}

fn try_flatten_schema(
    schema: &mut Option<String>,
    schema_ref: &mut Option<String>,
    typescript_parser: &TsParser,
    source_file: &ParsedFile,
    base_directory: &Path,
    importable_identifiers: &HashSet<String>,
) -> bool {
    let Some(schema_text) = schema else {
        return false;
    };
    let Ok(flattened) = flatten_zod_schema(
        typescript_parser,
        schema_text,
        source_file,
        base_directory,
        importable_identifiers,
    ) else {
        return false;
    };
    if flattened == *schema_text {
        return false;
    }
    *schema = Some(flattened);
    *schema_ref = None;
    true
}

fn resolve_and_replace_identifier(
    input_schema: &mut Option<String>,
    output_schema: &mut Option<String>,
    identifier: &str,
    typescript_parser: &TsParser,
    source_file: &ParsedFile,
    base_directory: &Path,
    importable_identifiers: &HashSet<String>,
) -> bool {
    let Ok(resolved) = flatten_zod_schema(
        typescript_parser,
        identifier,
        source_file,
        base_directory,
        importable_identifiers,
    ) else {
        return false;
    };
    if resolved == identifier {
        return false;
    }

    let mut changed = false;
    if let Some(text) = input_schema {
        if text.contains(identifier) {
            *text = text.replace(identifier, &resolved);
            changed = true;
        }
    }
    if let Some(text) = output_schema {
        if text.contains(identifier) {
            *text = text.replace(identifier, &resolved);
            changed = true;
        }
    }
    changed
}

fn recollect_schema_identifiers(procedure: &mut ProcedureMetadata, typescript_parser: &TsParser) {
    let mut all_identifiers = HashSet::new();

    if let Some(schema_text) = &procedure.input_schema {
        all_identifiers.extend(collect_identifiers_from_schema_text(
            typescript_parser,
            schema_text,
        ));
    }

    if let Some(schema_text) = &procedure.output_schema {
        all_identifiers.extend(collect_identifiers_from_schema_text(
            typescript_parser,
            schema_text,
        ));
    }

    let mut identifiers: Vec<String> = all_identifiers.into_iter().collect();
    identifiers.sort();
    procedure.schema_identifiers = identifiers;
}

fn collect_identifiers_from_schema_text(
    typescript_parser: &TsParser,
    schema_text: &str,
) -> Vec<String> {
    let wrapper = format!("const __temp = {schema_text};");
    let Ok(parsed) = typescript_parser.parse_source("<schema>", &wrapper) else {
        return Vec::new();
    };

    let Some(expression) = extract_initializer_expression(&parsed.module) else {
        return Vec::new();
    };

    collect_schema_identifiers(expression)
}

fn extract_initializer_expression(module: &swc_ecma_ast::Module) -> Option<&swc_ecma_ast::Expr> {
    for item in &module.body {
        let ModuleItem::Stmt(Stmt::Decl(Decl::Var(variable_declaration))) = item else {
            continue;
        };
        let initializer = variable_declaration
            .decls
            .first()
            .and_then(|declarator| declarator.init.as_deref());
        if initializer.is_some() {
            return initializer;
        }
    }
    None
}

fn find_parsed_file<'a>(
    parsed_files: &'a [ParsedFile],
    file_path: &Path,
) -> Option<&'a ParsedFile> {
    parsed_files
        .iter()
        .find(|parsed_file| parsed_file.file_path == file_path)
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
