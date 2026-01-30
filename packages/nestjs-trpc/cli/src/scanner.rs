use crate::error::ScannerError;
use globset::GlobMatcher;
use std::path::{Path, PathBuf};
use tracing::{debug, trace, warn};
use walkdir::WalkDir;

pub type ScannerResult<T> = std::result::Result<T, ScannerError>;

#[derive(Debug, Clone)]
pub struct FileScanner {
    base_dir: PathBuf,
    max_depth: Option<usize>,

    follow_symlinks: bool,
}

impl FileScanner {
    pub fn new<P: AsRef<Path>>(base_dir: P) -> ScannerResult<Self> {
        let base_dir = base_dir.as_ref().to_path_buf();

        if !base_dir.exists() {
            return Err(ScannerError::DirectoryNotFound(base_dir));
        }

        if !base_dir.is_dir() {
            return Err(ScannerError::NotADirectory(base_dir));
        }

        Ok(Self {
            base_dir,
            max_depth: None,
            follow_symlinks: false,
        })
    }

    #[must_use]
    pub const fn with_max_depth(mut self, max_depth: usize) -> Self {
        self.max_depth = Some(max_depth);
        self
    }

    pub fn scan(&self, pattern: &str) -> ScannerResult<Vec<PathBuf>> {
        let matcher = Self::compile_pattern(pattern)?;
        let walker = self.build_walker();

        let mut files: Vec<PathBuf> = walker
            .filter_map(|entry| self.process_entry(entry, &matcher))
            .collect();

        files.sort();
        debug!(count = files.len(), "Scan complete");
        Ok(files)
    }

    fn process_entry(
        &self,
        entry: std::result::Result<walkdir::DirEntry, walkdir::Error>,
        matcher: &GlobMatcher,
    ) -> Option<PathBuf> {
        let entry = match entry {
            Ok(e) => e,
            Err(err) => {
                warn!(error = %err, "Error reading directory entry");
                return None;
            }
        };

        let path = entry.path();
        if !path.is_file() {
            return None;
        }

        let relative_path = path.strip_prefix(&self.base_dir).unwrap_or(path);
        if !matcher.is_match(relative_path) {
            return None;
        }

        trace!(path = ?path, "Found matching file");
        Some(path.to_path_buf())
    }

    pub fn scan_absolute(&self, pattern: &str) -> ScannerResult<Vec<PathBuf>> {
        let files = self.scan(pattern)?;

        files
            .into_iter()
            .map(|p| {
                p.canonicalize()
                    .map_err(|e| ScannerError::IoError(p.clone(), e.to_string()))
            })
            .collect()
    }

    fn compile_pattern(pattern: &str) -> ScannerResult<GlobMatcher> {
        use globset::GlobBuilder;

        let glob = GlobBuilder::new(pattern)
            .literal_separator(true)
            .build()
            .map_err(|e| ScannerError::InvalidPattern(pattern.to_string(), e.to_string()))?;

        Ok(glob.compile_matcher())
    }

    fn build_walker(
        &self,
    ) -> walkdir::FilterEntry<walkdir::IntoIter, impl FnMut(&walkdir::DirEntry) -> bool> {
        let mut walker = WalkDir::new(&self.base_dir).follow_links(self.follow_symlinks);

        if let Some(depth) = self.max_depth {
            walker = walker.max_depth(depth);
        }

        let base_dir = self.base_dir.clone();
        walker
            .into_iter()
            .filter_entry(move |entry| Self::should_include_entry(entry, &base_dir))
    }

    fn should_include_entry(entry: &walkdir::DirEntry, base_dir: &Path) -> bool {
        // Always allow the root directory
        if entry.path() == base_dir {
            return true;
        }
        let file_name = entry.file_name().to_string_lossy();
        !file_name.starts_with('.')
    }

    #[must_use]
    pub fn base_dir(&self) -> &Path {
        &self.base_dir
    }
}

pub fn scan_for_routers<P: AsRef<Path>>(base_dir: P, pattern: &str) -> ScannerResult<Vec<PathBuf>> {
    let scanner = FileScanner::new(base_dir)?;
    scanner.scan(pattern)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use tempfile::TempDir;

    fn setup_test_dir() -> TempDir {
        let temp_dir = TempDir::new().expect("Failed to create temp dir");
        let base = temp_dir.path();

        // Create directory structure
        fs::create_dir_all(base.join("src/routers")).unwrap();
        fs::create_dir_all(base.join("src/services")).unwrap();
        fs::create_dir_all(base.join("src/nested/deep")).unwrap();
        fs::create_dir_all(base.join(".hidden")).unwrap();

        // Create files
        fs::write(base.join("src/user.router.ts"), "// user router").unwrap();
        fs::write(base.join("src/post.router.ts"), "// post router").unwrap();
        fs::write(base.join("src/routers/auth.router.ts"), "// auth router").unwrap();
        fs::write(base.join("src/services/user.service.ts"), "// user service").unwrap();
        fs::write(base.join("src/nested/deep/nested.router.ts"), "// nested").unwrap();
        fs::write(base.join(".hidden/secret.router.ts"), "// hidden").unwrap();
        fs::write(base.join("package.json"), "{}").unwrap();

        temp_dir
    }

    #[test]
    fn test_scanner_creation() {
        let temp_dir = setup_test_dir();
        let scanner = FileScanner::new(temp_dir.path());
        assert!(scanner.is_ok());
    }

    #[test]
    fn test_scanner_directory_not_found() {
        let result = FileScanner::new("/nonexistent/path/that/does/not/exist");
        assert!(matches!(result, Err(ScannerError::DirectoryNotFound(_))));
    }

    #[test]
    fn test_scanner_not_a_directory() {
        let temp_dir = setup_test_dir();
        let file_path = temp_dir.path().join("package.json");
        let result = FileScanner::new(file_path);
        assert!(matches!(result, Err(ScannerError::NotADirectory(_))));
    }

    #[test]
    fn test_scan_router_files() {
        let temp_dir = setup_test_dir();
        let scanner = FileScanner::new(temp_dir.path()).unwrap();
        let files = scanner.scan("**/*.router.ts").unwrap();

        // Should find all router files (except hidden)
        assert_eq!(files.len(), 4);

        // Verify all files have .router.ts extension
        for file in &files {
            let file_name = file.file_name().unwrap().to_string_lossy();
            assert!(file_name.ends_with(".router.ts"));
        }
    }

    #[test]
    fn test_scan_specific_directory() {
        let temp_dir = setup_test_dir();
        let scanner = FileScanner::new(temp_dir.path()).unwrap();
        let files = scanner.scan("src/*.router.ts").unwrap();

        // Should only find routers in src/ (not in subdirectories)
        assert_eq!(files.len(), 2);
    }

    #[test]
    fn test_scan_nested_pattern() {
        let temp_dir = setup_test_dir();
        let scanner = FileScanner::new(temp_dir.path()).unwrap();
        let files = scanner.scan("src/routers/*.router.ts").unwrap();

        assert_eq!(files.len(), 1);
        let file_name = files[0].file_name().unwrap().to_string_lossy();
        assert_eq!(file_name, "auth.router.ts");
    }

    #[test]
    fn test_scan_skips_hidden_directories() {
        let temp_dir = setup_test_dir();
        let scanner = FileScanner::new(temp_dir.path()).unwrap();
        let files = scanner.scan("**/*.router.ts").unwrap();

        // Should not include the file in .hidden directory
        for file in &files {
            assert!(
                !file.to_string_lossy().contains(".hidden"),
                "Should skip hidden directories"
            );
        }
    }

    #[test]
    fn test_scan_no_matches() {
        let temp_dir = setup_test_dir();
        let scanner = FileScanner::new(temp_dir.path()).unwrap();
        let files = scanner.scan("**/*.nonexistent").unwrap();

        assert!(files.is_empty());
    }

    #[test]
    fn test_scan_with_max_depth() {
        let temp_dir = setup_test_dir();
        let scanner = FileScanner::new(temp_dir.path()).unwrap().with_max_depth(2);
        let files = scanner.scan("**/*.router.ts").unwrap();

        // With max_depth=2, should find src/*.router.ts but not deeper nested ones
        // Depth 0: temp_dir, Depth 1: src, Depth 2: files in src
        // Should not find routers in src/routers/ or src/nested/deep/
        let temp_path_depth = temp_dir.path().iter().count();
        for file in &files {
            let file_depth = file.iter().count();
            let relative_depth = file_depth - temp_path_depth;
            assert!(
                relative_depth <= 2,
                "File {file:?} should be within max depth"
            );
        }
    }

    #[test]
    fn test_scan_invalid_pattern() {
        let temp_dir = setup_test_dir();
        let scanner = FileScanner::new(temp_dir.path()).unwrap();
        // Unclosed bracket is invalid
        let result = scanner.scan("**/*.router[.ts");

        assert!(matches!(result, Err(ScannerError::InvalidPattern(_, _))));
    }

    #[test]
    fn test_scan_deterministic_order() {
        let temp_dir = setup_test_dir();
        let scanner = FileScanner::new(temp_dir.path()).unwrap();

        // Run scan multiple times - should return same order
        let files1 = scanner.scan("**/*.router.ts").unwrap();
        let files2 = scanner.scan("**/*.router.ts").unwrap();

        assert_eq!(files1, files2);
    }

    #[test]
    fn test_convenience_function() {
        let temp_dir = setup_test_dir();
        let files = scan_for_routers(temp_dir.path(), "**/*.router.ts").unwrap();

        assert_eq!(files.len(), 4);
    }

    #[test]
    fn test_base_dir_accessor() {
        let temp_dir = setup_test_dir();
        let scanner = FileScanner::new(temp_dir.path()).unwrap();

        assert_eq!(scanner.base_dir(), temp_dir.path());
    }

    #[test]
    fn test_scan_service_files() {
        let temp_dir = setup_test_dir();
        let scanner = FileScanner::new(temp_dir.path()).unwrap();
        let files = scanner.scan("**/*.service.ts").unwrap();

        assert_eq!(files.len(), 1);
        let file_name = files[0].file_name().unwrap().to_string_lossy();
        assert_eq!(file_name, "user.service.ts");
    }
}
