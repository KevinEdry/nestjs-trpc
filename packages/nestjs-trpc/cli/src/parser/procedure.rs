use super::{DecoratorParser, ParsedFile};
use crate::ProcedureMetadata;
use swc_ecma_ast::{Class, ClassMember, Decl, ModuleDecl, ModuleItem, Stmt};

#[must_use]
pub fn extract_procedures_from_class(
    parsed_file: &ParsedFile,
    class_name: &str,
    decorator_parser: &DecoratorParser,
) -> Vec<ProcedureMetadata> {
    let Some(class) = find_class_by_name(&parsed_file.module.body, class_name) else {
        return Vec::new();
    };

    extract_procedures_from_class_body(class, decorator_parser, parsed_file)
}

fn find_class_by_name<'a>(body: &'a [ModuleItem], target_name: &str) -> Option<&'a Class> {
    body.iter()
        .find_map(|item| match_class_in_item(item, target_name))
}

fn match_class_in_item<'a>(item: &'a ModuleItem, target_name: &str) -> Option<&'a Class> {
    match item {
        ModuleItem::ModuleDecl(ModuleDecl::ExportDecl(export_declaration)) => {
            match_exported_class(&export_declaration.decl, target_name)
        }
        ModuleItem::Stmt(Stmt::Decl(Decl::Class(class_declaration))) => {
            match_class_declaration(class_declaration, target_name)
        }
        ModuleItem::ModuleDecl(ModuleDecl::ExportDefaultDecl(export_default)) => {
            match_default_exported_class(&export_default.decl, target_name)
        }
        _ => None,
    }
}

fn match_exported_class<'a>(declaration: &'a Decl, target_name: &str) -> Option<&'a Class> {
    let Decl::Class(class_declaration) = declaration else {
        return None;
    };

    match_class_declaration(class_declaration, target_name)
}

fn match_class_declaration<'a>(
    class_declaration: &'a swc_ecma_ast::ClassDecl,
    target_name: &str,
) -> Option<&'a Class> {
    let class_matches = class_declaration.ident.sym.as_ref() == target_name;

    if !class_matches {
        return None;
    }

    Some(&class_declaration.class)
}

fn match_default_exported_class<'a>(
    declaration: &'a swc_ecma_ast::DefaultDecl,
    target_name: &str,
) -> Option<&'a Class> {
    let swc_ecma_ast::DefaultDecl::Class(class_expression) = declaration else {
        return None;
    };

    let class_matches = class_expression
        .ident
        .as_ref()
        .is_some_and(|identifier| identifier.sym.as_ref() == target_name);

    if !class_matches {
        return None;
    }

    Some(&class_expression.class)
}

fn extract_procedures_from_class_body(
    class: &Class,
    decorator_parser: &DecoratorParser,
    parsed_file: &ParsedFile,
) -> Vec<ProcedureMetadata> {
    let mut procedures = Vec::new();

    for member in &class.body {
        let ClassMember::Method(method) = member else {
            continue;
        };

        let Some(method_name) = method
            .key
            .as_ident()
            .map(|identifier| identifier.sym.to_string())
        else {
            continue;
        };

        let decorator_infos =
            decorator_parser.extract_procedure_decorators(&method.function.decorators, parsed_file);

        for info in decorator_infos {
            procedures.push(ProcedureMetadata {
                name: method_name.clone(),
                procedure_type: info.procedure_type,
                input_schema: info.input,
                output_schema: info.output,
                input_schema_ref: info.input_ref,
                output_schema_ref: info.output_ref,
                schema_identifiers: info.schema_identifiers,
            });
        }
    }

    procedures
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::parser::TsParser;
    use crate::ProcedureType;
    use std::fs;
    use tempfile::TempDir;

    fn create_temp_file(content: &str) -> (TempDir, std::path::PathBuf) {
        let temp_dir = TempDir::new().expect("Failed to create temp dir");
        let file_path = temp_dir.path().join("test.ts");
        fs::write(&file_path, content).expect("Failed to write test file");
        (temp_dir, file_path)
    }

    #[test]
    fn test_extract_procedures_from_exported_class() {
        let source = r"
            import { Router, Query, Mutation } from 'nestjs-trpc';
            import { z } from 'zod';

            @Router()
            export class UserRouter {
                @Query({
                    input: z.object({ id: z.string() }),
                    output: z.object({ name: z.string() }),
                })
                async getUser() {}

                @Mutation({
                    input: z.object({ name: z.string() }),
                })
                async createUser() {}
            }
        ";
        let (_temp, path) = create_temp_file(source);

        let parser = TsParser::new();
        let parsed = parser.parse_file(&path).expect("Failed to parse");
        let decorator_parser = DecoratorParser::new();

        let procedures = extract_procedures_from_class(&parsed, "UserRouter", &decorator_parser);

        assert_eq!(procedures.len(), 2);
        assert_eq!(procedures[0].name, "getUser");
        assert_eq!(procedures[0].procedure_type, ProcedureType::Query);
        assert!(procedures[0].input_schema.is_some());
        assert!(procedures[0].output_schema.is_some());

        assert_eq!(procedures[1].name, "createUser");
        assert_eq!(procedures[1].procedure_type, ProcedureType::Mutation);
        assert!(procedures[1].input_schema.is_some());
    }

    #[test]
    fn test_extract_procedures_from_non_exported_class() {
        let source = r"
            import { Router, Query } from 'nestjs-trpc';
            import { z } from 'zod';

            @Router()
            class PostRouter {
                @Query({
                    input: z.object({ id: z.string() }),
                })
                async getPost() {}
            }
        ";
        let (_temp, path) = create_temp_file(source);

        let parser = TsParser::new();
        let parsed = parser.parse_file(&path).expect("Failed to parse");
        let decorator_parser = DecoratorParser::new();

        let procedures = extract_procedures_from_class(&parsed, "PostRouter", &decorator_parser);

        assert_eq!(procedures.len(), 1);
        assert_eq!(procedures[0].name, "getPost");
        assert_eq!(procedures[0].procedure_type, ProcedureType::Query);
    }

    #[test]
    fn test_extract_procedures_from_default_export() {
        let source = r"
            import { Router, Query } from 'nestjs-trpc';
            import { z } from 'zod';

            @Router()
            export default class CommentRouter {
                @Query({
                    input: z.object({ id: z.string() }),
                })
                async getComment() {}
            }
        ";
        let (_temp, path) = create_temp_file(source);

        let parser = TsParser::new();
        let parsed = parser.parse_file(&path).expect("Failed to parse");
        let decorator_parser = DecoratorParser::new();

        let procedures = extract_procedures_from_class(&parsed, "CommentRouter", &decorator_parser);

        assert_eq!(procedures.len(), 1);
        assert_eq!(procedures[0].name, "getComment");
    }

    #[test]
    fn test_extract_procedures_class_not_found() {
        let source = r"
            import { Router, Query } from 'nestjs-trpc';
            import { z } from 'zod';

            @Router()
            export class UserRouter {
                @Query({
                    input: z.object({ id: z.string() }),
                })
                async getUser() {}
            }
        ";
        let (_temp, path) = create_temp_file(source);

        let parser = TsParser::new();
        let parsed = parser.parse_file(&path).expect("Failed to parse");
        let decorator_parser = DecoratorParser::new();

        let procedures =
            extract_procedures_from_class(&parsed, "NonExistentRouter", &decorator_parser);

        assert_eq!(procedures.len(), 0);
    }

    #[test]
    fn test_extract_procedures_no_decorators() {
        let source = r"
            import { Router } from 'nestjs-trpc';

            @Router()
            export class EmptyRouter {
                async regularMethod() {}
            }
        ";
        let (_temp, path) = create_temp_file(source);

        let parser = TsParser::new();
        let parsed = parser.parse_file(&path).expect("Failed to parse");
        let decorator_parser = DecoratorParser::new();

        let procedures = extract_procedures_from_class(&parsed, "EmptyRouter", &decorator_parser);

        assert_eq!(procedures.len(), 0);
    }

    #[test]
    fn test_extract_procedures_multiple_decorators_on_same_method() {
        let source = r"
            import { Router, Query } from 'nestjs-trpc';
            import { z } from 'zod';

            @Router()
            export class TestRouter {
                @Query({
                    input: z.object({ id: z.string() }),
                })
                @Query({
                    input: z.object({ email: z.string() }),
                })
                async getUser() {}
            }
        ";
        let (_temp, path) = create_temp_file(source);

        let parser = TsParser::new();
        let parsed = parser.parse_file(&path).expect("Failed to parse");
        let decorator_parser = DecoratorParser::new();

        let procedures = extract_procedures_from_class(&parsed, "TestRouter", &decorator_parser);

        assert_eq!(procedures.len(), 2);
        assert_eq!(procedures[0].name, "getUser");
        assert_eq!(procedures[1].name, "getUser");
    }

    #[test]
    fn test_extract_procedures_mixed_queries_and_mutations() {
        let source = r"
            import { Router, Query, Mutation } from 'nestjs-trpc';
            import { z } from 'zod';

            @Router()
            export class MixedRouter {
                @Query({ input: z.string() })
                async query1() {}

                @Mutation({ input: z.string() })
                async mutation1() {}

                @Query({ input: z.string() })
                async query2() {}

                @Mutation({ input: z.string() })
                async mutation2() {}
            }
        ";
        let (_temp, path) = create_temp_file(source);

        let parser = TsParser::new();
        let parsed = parser.parse_file(&path).expect("Failed to parse");
        let decorator_parser = DecoratorParser::new();

        let procedures = extract_procedures_from_class(&parsed, "MixedRouter", &decorator_parser);

        assert_eq!(procedures.len(), 4);
        assert_eq!(procedures[0].procedure_type, ProcedureType::Query);
        assert_eq!(procedures[1].procedure_type, ProcedureType::Mutation);
        assert_eq!(procedures[2].procedure_type, ProcedureType::Query);
        assert_eq!(procedures[3].procedure_type, ProcedureType::Mutation);
    }

    #[test]
    fn test_extract_procedures_with_constructor_and_properties() {
        let source = r"
            import { Router, Query } from 'nestjs-trpc';
            import { z } from 'zod';

            @Router()
            export class ComplexRouter {
                private service: any;

                constructor(service: any) {
                    this.service = service;
                }

                @Query({ input: z.string() })
                async getData() {}
            }
        ";
        let (_temp, path) = create_temp_file(source);

        let parser = TsParser::new();
        let parsed = parser.parse_file(&path).expect("Failed to parse");
        let decorator_parser = DecoratorParser::new();

        let procedures = extract_procedures_from_class(&parsed, "ComplexRouter", &decorator_parser);

        assert_eq!(procedures.len(), 1);
        assert_eq!(procedures[0].name, "getData");
    }

    #[test]
    fn test_extract_procedures_only_output_schema() {
        let source = r"
            import { Router, Query } from 'nestjs-trpc';
            import { z } from 'zod';

            @Router()
            export class OutputRouter {
                @Query({
                    output: z.object({ data: z.string() }),
                })
                async getData() {}
            }
        ";
        let (_temp, path) = create_temp_file(source);

        let parser = TsParser::new();
        let parsed = parser.parse_file(&path).expect("Failed to parse");
        let decorator_parser = DecoratorParser::new();

        let procedures = extract_procedures_from_class(&parsed, "OutputRouter", &decorator_parser);

        assert_eq!(procedures.len(), 1);
        assert!(procedures[0].input_schema.is_none());
        assert!(procedures[0].output_schema.is_some());
    }

    #[test]
    fn test_extract_procedures_computed_method_names() {
        let source = r"
            import { Router, Query } from 'nestjs-trpc';
            import { z } from 'zod';

            @Router()
            export class TestRouter {
                @Query({ input: z.string() })
                async normalMethod() {}
            }
        ";
        let (_temp, path) = create_temp_file(source);

        let parser = TsParser::new();
        let parsed = parser.parse_file(&path).expect("Failed to parse");
        let decorator_parser = DecoratorParser::new();

        let procedures = extract_procedures_from_class(&parsed, "TestRouter", &decorator_parser);

        assert_eq!(procedures.len(), 1);
        assert_eq!(procedures[0].name, "normalMethod");
    }
}
