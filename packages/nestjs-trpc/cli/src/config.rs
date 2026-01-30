use std::fs;
use std::path::{Path, PathBuf};

use swc_ecma_ast::{
    ExportDefaultExpr, Expr, ExprOrSpread, Lit, ModuleDecl, ModuleItem, ObjectLit, Prop, PropName,
    PropOrSpread,
};
use tracing::trace;

use crate::error::ConfigError;
use crate::parser::TsParser;

const DEFAULT_OUTPUT_PATH: &str = "./src/@generated";
const DEFAULT_ROUTER_PATTERN: &str = "src/**/*.router.ts";
const DEFAULT_ROOT_MODULE: &str = "src/app.module.ts";

#[derive(Debug, Clone, Default)]
pub struct Config {
    pub generation: GenerationConfig,
    pub parsing: ParsingConfig,
}

#[derive(Debug, Clone)]
pub struct GenerationConfig {
    pub output_path: PathBuf,
    pub router_pattern: String,
    pub root_module: PathBuf,
}

#[derive(Debug, Clone)]
pub struct ParsingConfig {
    pub decorators: bool,
}

impl Default for GenerationConfig {
    fn default() -> Self {
        Self {
            output_path: PathBuf::from(DEFAULT_OUTPUT_PATH),
            router_pattern: DEFAULT_ROUTER_PATTERN.to_string(),
            root_module: PathBuf::from(DEFAULT_ROOT_MODULE),
        }
    }
}

impl Default for ParsingConfig {
    fn default() -> Self {
        Self { decorators: true }
    }
}

impl Config {
    pub fn load<P: AsRef<Path>>(path: P) -> Result<Self, ConfigError> {
        let path = path.as_ref();

        if !path.exists() {
            return Err(ConfigError::NotFound {
                path: path.to_path_buf(),
            });
        }

        let contents = fs::read_to_string(path).map_err(|source| ConfigError::ReadFailed {
            path: path.to_path_buf(),
            source,
        })?;

        trace!(content_length = contents.len(), "Read configuration file");

        Self::parse(&contents, path)
    }

    pub fn parse<P: AsRef<Path>>(ts_source: &str, path: P) -> Result<Self, ConfigError> {
        let path = path.as_ref();
        let parser = TsParser::new();

        let parsed =
            parser
                .parse_source(path, ts_source)
                .map_err(|e| ConfigError::InvalidSyntax {
                    path: path.to_path_buf(),
                    message: format!("Failed to parse TypeScript: {e}"),
                })?;

        let config_obj = Self::extract_default_export(&parsed.module.body, path)?;
        Self::parse_config_object(config_obj, path)
    }

    fn extract_default_export<'a>(
        body: &'a [ModuleItem],
        path: &Path,
    ) -> Result<&'a ObjectLit, ConfigError> {
        let default_export = body.iter().find_map(Self::find_default_export_expression);

        let Some(expression) = default_export else {
            return Err(ConfigError::InvalidSyntax {
                path: path.to_path_buf(),
                message: "No default export found in config file".to_string(),
            });
        };

        Self::extract_object_from_expression(expression, path)
    }

    fn find_default_export_expression(item: &ModuleItem) -> Option<&Expr> {
        let ModuleItem::ModuleDecl(ModuleDecl::ExportDefaultExpr(ExportDefaultExpr {
            expr, ..
        })) = item
        else {
            return None;
        };

        Some(expr)
    }

    fn extract_object_from_expression<'a>(
        expression: &'a Expr,
        path: &Path,
    ) -> Result<&'a ObjectLit, ConfigError> {
        match expression {
            Expr::Object(object) => Ok(object),
            Expr::Call(call) => Self::extract_object_from_define_config_call(call, path),
            _ => Err(ConfigError::InvalidSyntax {
                path: path.to_path_buf(),
                message: "Default export must be an object literal or defineConfig call"
                    .to_string(),
            }),
        }
    }

    fn extract_object_from_define_config_call<'a>(
        call: &'a swc_ecma_ast::CallExpr,
        path: &Path,
    ) -> Result<&'a ObjectLit, ConfigError> {
        let Some(ExprOrSpread { spread: None, expr }) = call.args.first() else {
            return Err(Self::invalid_define_config_error(path));
        };

        let Expr::Object(object) = &**expr else {
            return Err(Self::invalid_define_config_error(path));
        };

        Ok(object)
    }

    fn invalid_define_config_error(path: &Path) -> ConfigError {
        ConfigError::InvalidSyntax {
            path: path.to_path_buf(),
            message:
                "Default export must be an object literal or defineConfig call with object literal"
                    .to_string(),
        }
    }

    fn parse_config_object(object: &ObjectLit, path: &Path) -> Result<Self, ConfigError> {
        let mut config = Self::default();

        for (key, value) in Self::iterate_key_value_properties(object) {
            Self::apply_config_field(&mut config, &key, value, path)?;
        }

        Ok(config)
    }

    fn apply_config_field(
        config: &mut Self,
        key: &str,
        value: &Expr,
        path: &Path,
    ) -> Result<(), ConfigError> {
        match key {
            "generation" => Self::apply_generation_section(config, value, path),
            "parsing" => Self::apply_parsing_section(config, value, path),
            _ => Err(ConfigError::InvalidSyntax {
                path: path.to_path_buf(),
                message: format!("Unknown field: {key}"),
            }),
        }
    }

    fn apply_generation_section(
        config: &mut Self,
        value: &Expr,
        path: &Path,
    ) -> Result<(), ConfigError> {
        let Expr::Object(generation_object) = value else {
            return Ok(());
        };
        config.generation = Self::parse_generation_config(generation_object, path)?;
        Ok(())
    }

    fn apply_parsing_section(
        config: &mut Self,
        value: &Expr,
        path: &Path,
    ) -> Result<(), ConfigError> {
        let Expr::Object(parsing_object) = value else {
            return Ok(());
        };
        config.parsing = Self::parse_parsing_config(parsing_object, path)?;
        Ok(())
    }

    fn parse_generation_config(
        object: &ObjectLit,
        path: &Path,
    ) -> Result<GenerationConfig, ConfigError> {
        let mut config = GenerationConfig::default();

        for (key, value) in Self::iterate_key_value_properties(object) {
            Self::apply_generation_field(&mut config, &key, value, path)?;
        }

        Ok(config)
    }

    fn apply_generation_field(
        config: &mut GenerationConfig,
        key: &str,
        value: &Expr,
        path: &Path,
    ) -> Result<(), ConfigError> {
        match key {
            "outputPath" => Self::set_output_path(config, value),
            "routerPattern" => Self::set_router_pattern(config, value),
            "rootModule" => Self::set_root_module(config, value),
            _ => {
                return Err(ConfigError::InvalidSyntax {
                    path: path.to_path_buf(),
                    message: format!("Unknown generation field: {key}"),
                });
            }
        }
        Ok(())
    }

    fn set_output_path(config: &mut GenerationConfig, value: &Expr) {
        if let Some(string_value) = Self::extract_string_literal(value) {
            config.output_path = PathBuf::from(string_value);
        }
    }

    fn set_router_pattern(config: &mut GenerationConfig, value: &Expr) {
        if let Some(string_value) = Self::extract_string_literal(value) {
            config.router_pattern = string_value;
        }
    }

    fn set_root_module(config: &mut GenerationConfig, value: &Expr) {
        if let Some(string_value) = Self::extract_string_literal(value) {
            config.root_module = PathBuf::from(string_value);
        }
    }

    fn parse_parsing_config(object: &ObjectLit, path: &Path) -> Result<ParsingConfig, ConfigError> {
        let mut config = ParsingConfig::default();

        for (key, value) in Self::iterate_key_value_properties(object) {
            Self::apply_parsing_field(&mut config, &key, value, path)?;
        }

        Ok(config)
    }

    fn apply_parsing_field(
        config: &mut ParsingConfig,
        key: &str,
        value: &Expr,
        path: &Path,
    ) -> Result<(), ConfigError> {
        match key {
            "decorators" => Self::set_decorators(config, value),
            _ => {
                return Err(ConfigError::InvalidSyntax {
                    path: path.to_path_buf(),
                    message: format!("Unknown parsing field: {key}"),
                });
            }
        }
        Ok(())
    }

    fn set_decorators(config: &mut ParsingConfig, value: &Expr) {
        if let Expr::Lit(Lit::Bool(boolean)) = value {
            config.decorators = boolean.value;
        }
    }

    fn iterate_key_value_properties(object: &ObjectLit) -> impl Iterator<Item = (String, &Expr)> {
        object.props.iter().filter_map(Self::extract_key_value_pair)
    }

    fn extract_key_value_pair(property_or_spread: &PropOrSpread) -> Option<(String, &Expr)> {
        let PropOrSpread::Prop(property) = property_or_spread else {
            return None;
        };
        let Prop::KeyValue(key_value) = &**property else {
            return None;
        };
        let key = Self::extract_property_key(&key_value.key)?;
        Some((key, &key_value.value))
    }

    fn extract_property_key(property_name: &PropName) -> Option<String> {
        match property_name {
            PropName::Ident(identifier) => Some(identifier.sym.to_string()),
            PropName::Str(string) => Some(string.value.to_string_lossy().into_owned()),
            _ => None,
        }
    }

    fn extract_string_literal(expression: &Expr) -> Option<String> {
        let Expr::Lit(Lit::Str(string_literal)) = expression else {
            return None;
        };
        Some(string_literal.value.to_string_lossy().into_owned())
    }

    #[must_use]
    pub fn with_output_path(mut self, output_path: PathBuf) -> Self {
        self.generation.output_path = output_path;
        self
    }

    #[must_use]
    pub fn resolve_paths<P: AsRef<Path>>(mut self, base: P) -> Self {
        let base = base.as_ref();

        if self.generation.output_path.is_relative() {
            self.generation.output_path = base.join(&self.generation.output_path);
        }

        if self.generation.root_module.is_relative() {
            self.generation.root_module = base.join(&self.generation.root_module);
        }

        self
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_full_config() {
        let ts = r"
export default {
  generation: {
    outputPath: './dist/generated',
    routerPattern: 'lib/**/*.router.ts',
    rootModule: 'lib/app.module.ts'
  },
  parsing: {
    decorators: true
  }
}
";

        let config = Config::parse(ts, "test.config.ts").expect("Failed to parse config");

        assert_eq!(
            config.generation.output_path,
            PathBuf::from("./dist/generated")
        );
        assert_eq!(config.generation.router_pattern, "lib/**/*.router.ts");
        assert_eq!(
            config.generation.root_module,
            PathBuf::from("lib/app.module.ts")
        );
        assert!(config.parsing.decorators);
    }

    #[test]
    fn test_parse_minimal_config() {
        let ts = r"
export default {
  generation: {
    outputPath: './output'
  }
}
";

        let config = Config::parse(ts, "test.config.ts").expect("Failed to parse config");

        assert_eq!(config.generation.output_path, PathBuf::from("./output"));
        assert_eq!(config.generation.router_pattern, "src/**/*.router.ts");
        assert_eq!(
            config.generation.root_module,
            PathBuf::from("src/app.module.ts")
        );
        assert!(config.parsing.decorators);
    }

    #[test]
    fn test_parse_empty_config() {
        let ts = "export default {}";

        let config = Config::parse(ts, "test.config.ts").expect("Failed to parse empty config");

        assert_eq!(
            config.generation.output_path,
            PathBuf::from("./src/@generated")
        );
        assert_eq!(config.generation.router_pattern, "src/**/*.router.ts");
        assert_eq!(
            config.generation.root_module,
            PathBuf::from("src/app.module.ts")
        );
        assert!(config.parsing.decorators);
    }

    #[test]
    fn test_parse_decorators_false() {
        let ts = r"
export default {
  parsing: {
    decorators: false
  }
}
";

        let config = Config::parse(ts, "test.config.ts").expect("Failed to parse config");

        assert!(!config.parsing.decorators);
    }

    #[test]
    fn test_parse_invalid_syntax() {
        let ts = "export default { invalid typescript";

        let result = Config::parse(ts, "test.config.ts");
        assert!(result.is_err());
    }

    #[test]
    fn test_parse_no_default_export() {
        let ts = "const config = {}";

        let result = Config::parse(ts, "test.config.ts");
        assert!(result.is_err());

        let err = result.unwrap_err();
        match err {
            ConfigError::InvalidSyntax { message, .. } => {
                assert!(message.contains("No default export"));
            }
            _ => panic!("Expected InvalidSyntax error"),
        }
    }

    #[test]
    fn test_parse_unknown_field() {
        let ts = r"
export default {
  generation: {
    outputPath: './output',
    unknownField: 'should fail'
  }
}
";

        let result = Config::parse(ts, "test.config.ts");
        assert!(result.is_err());

        let err = result.unwrap_err();
        match err {
            ConfigError::InvalidSyntax { message, .. } => {
                assert!(message.contains("Unknown generation field"));
            }
            _ => panic!("Expected InvalidSyntax error for unknown field"),
        }
    }

    #[test]
    fn test_default_config() {
        let config = Config::default();

        assert_eq!(
            config.generation.output_path,
            PathBuf::from("./src/@generated")
        );
        assert_eq!(config.generation.router_pattern, "src/**/*.router.ts");
        assert_eq!(
            config.generation.root_module,
            PathBuf::from("src/app.module.ts")
        );
        assert!(config.parsing.decorators);
    }
}
