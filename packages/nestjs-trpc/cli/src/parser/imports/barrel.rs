use super::module_path::resolve_module_path;
use std::path::{Path, PathBuf};
use swc_ecma_ast::{
    ExportNamedSpecifier, ExportSpecifier, ModuleDecl, ModuleExportName, ModuleItem,
};
use tracing::trace;

/// Information about a named export found in a barrel file.
pub struct BarrelExport {
    pub original_name: String,
    #[allow(dead_code)] // Available for future use when tracking export aliasing
    pub exported_name: String,
    pub source_path: PathBuf,
}

/// Information about a star export (export * from './module').
pub struct StarExport {
    pub source_path: PathBuf,
}

/// Result of scanning a barrel file for exports.
pub enum BarrelExportMatch {
    Named(BarrelExport),
    Star(StarExport),
    None,
}

/// Checks if a module item contains an export matching the given name.
/// Returns information needed to resolve the export.
pub fn find_export_in_barrel_item(
    item: &ModuleItem,
    target_name: &str,
    barrel_directory: &Path,
) -> BarrelExportMatch {
    match item {
        ModuleItem::ModuleDecl(ModuleDecl::ExportNamed(export_named)) => {
            find_in_named_export(export_named, target_name, barrel_directory)
        }
        ModuleItem::ModuleDecl(ModuleDecl::ExportAll(export_all)) => {
            find_in_star_export(export_all, barrel_directory)
        }
        _ => BarrelExportMatch::None,
    }
}

fn find_in_named_export(
    export_named: &swc_ecma_ast::NamedExport,
    target_name: &str,
    barrel_directory: &Path,
) -> BarrelExportMatch {
    let Some(source) = &export_named.src else {
        return BarrelExportMatch::None;
    };

    let module_specifier = source.value.to_string_lossy().into_owned();
    if !is_relative_path(&module_specifier) {
        return BarrelExportMatch::None;
    }

    let Some(resolved_path) = resolve_module_path(barrel_directory, &module_specifier) else {
        return BarrelExportMatch::None;
    };

    export_named
        .specifiers
        .iter()
        .find_map(|specifier| match_named_export_specifier(specifier, target_name, &resolved_path))
        .map_or(BarrelExportMatch::None, BarrelExportMatch::Named)
}

fn find_in_star_export(
    export_all: &swc_ecma_ast::ExportAll,
    barrel_directory: &Path,
) -> BarrelExportMatch {
    let module_specifier = export_all.src.value.to_string_lossy().into_owned();
    if !is_relative_path(&module_specifier) {
        return BarrelExportMatch::None;
    }

    let Some(resolved_path) = resolve_module_path(barrel_directory, &module_specifier) else {
        return BarrelExportMatch::None;
    };

    BarrelExportMatch::Star(StarExport {
        source_path: resolved_path,
    })
}

fn is_relative_path(specifier: &str) -> bool {
    specifier.starts_with('.') || specifier.starts_with('/')
}

fn match_named_export_specifier(
    specifier: &ExportSpecifier,
    target_name: &str,
    resolved_path: &Path,
) -> Option<BarrelExport> {
    let ExportSpecifier::Named(ExportNamedSpecifier { orig, exported, .. }) = specifier else {
        return None;
    };

    let original_name = get_module_export_name(orig);
    let exported_name = exported
        .as_ref()
        .map_or_else(|| original_name.clone(), get_module_export_name);

    if exported_name != target_name {
        return None;
    }

    trace!(
        original = %original_name,
        exported = %exported_name,
        path = ?resolved_path,
        "Found matching barrel export"
    );

    Some(BarrelExport {
        original_name,
        exported_name,
        source_path: resolved_path.to_path_buf(),
    })
}

fn get_module_export_name(name: &ModuleExportName) -> String {
    match name {
        ModuleExportName::Ident(identifier) => identifier.sym.to_string(),
        ModuleExportName::Str(string) => string.value.to_string_lossy().into_owned(),
    }
}
