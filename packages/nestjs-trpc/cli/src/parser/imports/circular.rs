use super::module_path::resolve_module_path;
use crate::parser::ParsedFile;
use std::collections::HashSet;
use std::path::{Path, PathBuf};
use swc_ecma_ast::{ModuleDecl, ModuleItem};

/// Tracks state during circular import detection traversal.
pub struct CircularImportTracker {
    pub visited: HashSet<PathBuf>,
    pub path_stack: Vec<PathBuf>,
    pub cycles: Vec<String>,
}

impl CircularImportTracker {
    pub fn new() -> Self {
        Self {
            visited: HashSet::new(),
            path_stack: Vec::new(),
            cycles: Vec::new(),
        }
    }

    /// Returns true if the path is already in the current traversal stack (cycle detected).
    pub fn is_in_current_path(&self, file_path: &Path) -> bool {
        self.path_stack.contains(&file_path.to_path_buf())
    }

    /// Returns true if the path has already been fully visited.
    pub fn is_visited(&self, file_path: &Path) -> bool {
        self.visited.contains(file_path)
    }

    /// Records a cycle starting from the given path.
    pub fn record_cycle(&mut self, file_path: &Path) {
        let cycle_start = self
            .path_stack
            .iter()
            .position(|path| path == file_path)
            .unwrap_or(0);

        let cycle: Vec<_> = self.path_stack[cycle_start..]
            .iter()
            .map(|path| path.display().to_string())
            .collect();

        self.cycles
            .push(format!("{} -> {}", cycle.join(" -> "), file_path.display()));
    }

    /// Pushes a path onto the current traversal stack.
    pub fn push_path(&mut self, file_path: &Path) {
        self.path_stack.push(file_path.to_path_buf());
    }

    /// Pops a path from the traversal stack and marks it as visited.
    pub fn pop_and_mark_visited(&mut self, file_path: &Path) {
        self.path_stack.pop();
        self.visited.insert(file_path.to_path_buf());
    }
}

impl Default for CircularImportTracker {
    fn default() -> Self {
        Self::new()
    }
}

/// Extracts import paths from a parsed file.
/// Returns only relative imports (starting with . or /).
pub fn extract_import_paths(parsed: &ParsedFile, source_directory: &Path) -> Vec<PathBuf> {
    let mut import_paths = Vec::new();

    for item in &parsed.module.body {
        let ModuleItem::ModuleDecl(ModuleDecl::Import(import_declaration)) = item else {
            continue;
        };

        let module_specifier = import_declaration.src.value.to_string_lossy().into_owned();
        let is_relative = module_specifier.starts_with('.') || module_specifier.starts_with('/');

        if !is_relative {
            continue;
        }

        if let Some(resolved_path) = resolve_module_path(source_directory, &module_specifier) {
            import_paths.push(resolved_path);
        }
    }

    import_paths
}
