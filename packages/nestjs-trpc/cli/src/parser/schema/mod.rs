mod flatten;
mod helpers;

use crate::error::GeneratorError;
use crate::parser::{ParsedFile, TsParser};
use std::collections::HashSet;
use std::path::Path;

pub use flatten::ZodFlattener;

pub type ZodResult<T> = std::result::Result<T, GeneratorError>;

#[allow(clippy::implicit_hasher)]
pub fn flatten_zod_schema(
    parser: &TsParser,
    schema_text: &str,
    source_file: &ParsedFile,
    base_directory: &Path,
    importable_identifiers: &HashSet<String>,
) -> ZodResult<String> {
    let mut flattener = ZodFlattener::new(parser, base_directory)
        .with_importable_identifiers(importable_identifiers.clone());
    flattener.flatten_schema(schema_text, source_file)
}
