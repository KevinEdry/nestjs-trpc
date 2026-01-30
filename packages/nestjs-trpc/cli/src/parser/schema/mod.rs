mod flatten;
mod helpers;

use crate::error::GeneratorError;
use crate::parser::{ParsedFile, TsParser};
use std::path::Path;

pub use flatten::ZodFlattener;

pub type ZodResult<T> = std::result::Result<T, GeneratorError>;

pub fn flatten_zod_schema(
    parser: &TsParser,
    schema_text: &str,
    source_file: &ParsedFile,
    base_directory: &Path,
) -> ZodResult<String> {
    let mut flattener = ZodFlattener::new(parser, base_directory);
    flattener.flatten_schema(schema_text, source_file)
}
