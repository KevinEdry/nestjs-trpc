use crate::error::ImportError;
use std::path::PathBuf;
use swc_common::Span;

pub type ImportResult<T> = std::result::Result<T, ImportError>;

#[derive(Debug, Clone)]
pub struct ResolvedImport {
    pub name: String,
    pub source_file: PathBuf,
    pub declaration_span: Span,
    pub declaration_type: DeclarationType,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum DeclarationType {
    Variable,
    Class,
    Interface,
    Enum,
    Function,
    TypeAlias,
    Unknown,
}

impl std::fmt::Display for DeclarationType {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Variable => write!(f, "variable"),
            Self::Class => write!(f, "class"),
            Self::Interface => write!(f, "interface"),
            Self::Enum => write!(f, "enum"),
            Self::Function => write!(f, "function"),
            Self::TypeAlias => write!(f, "type alias"),
            Self::Unknown => write!(f, "unknown"),
        }
    }
}
