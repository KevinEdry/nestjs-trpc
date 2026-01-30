use super::ZodFlattener;
use super::ZodResult;
use crate::parser::imports::ResolvedImport;
use crate::parser::schema::helpers::ZodHelpers;
use crate::parser::ParsedFile;
use std::collections::HashMap;
use swc_ecma_ast::{Callee, Expr, Prop, PropOrSpread};

impl ZodFlattener<'_> {
    pub(super) fn flatten_object(
        &mut self,
        object_literal: &swc_ecma_ast::ObjectLit,
        source_file: &ParsedFile,
        imports_map: &HashMap<String, ResolvedImport>,
        mut schema: String,
        depth: usize,
    ) -> ZodResult<String> {
        for property_or_spread in &object_literal.props {
            schema = self.flatten_object_property(
                property_or_spread,
                source_file,
                imports_map,
                schema,
                depth,
            )?;
        }
        Ok(schema)
    }

    fn flatten_object_property(
        &mut self,
        property_or_spread: &PropOrSpread,
        source_file: &ParsedFile,
        imports_map: &HashMap<String, ResolvedImport>,
        mut schema: String,
        depth: usize,
    ) -> ZodResult<String> {
        let PropOrSpread::Prop(property) = property_or_spread else {
            return Ok(schema);
        };
        let Prop::KeyValue(key_value) = &**property else {
            return Ok(schema);
        };

        let property_text = self.get_source_text(source_file, self.get_key_value_span(key_value));
        let property_initializer_text =
            self.get_source_text(source_file, self.get_expression_span(&key_value.value));

        let flattened = self.flatten_expression(
            &key_value.value,
            source_file,
            imports_map,
            property_initializer_text.clone(),
            depth + 1,
        )?;

        if flattened == property_initializer_text {
            return Ok(schema);
        }

        let key_text = self.get_property_key_text(&key_value.key, source_file);
        let new_property_text = format!("{key_text}: {flattened}");
        schema = schema.replace(&property_text, &new_property_text);
        Ok(schema)
    }

    pub(super) fn flatten_array(
        &mut self,
        array_literal: &swc_ecma_ast::ArrayLit,
        source_file: &ParsedFile,
        imports_map: &HashMap<String, ResolvedImport>,
        mut schema: String,
        depth: usize,
    ) -> ZodResult<String> {
        for element in array_literal.elems.iter().flatten() {
            schema =
                self.flatten_array_element(element, source_file, imports_map, schema, depth)?;
        }
        Ok(schema)
    }

    fn flatten_array_element(
        &mut self,
        element: &swc_ecma_ast::ExprOrSpread,
        source_file: &ParsedFile,
        imports_map: &HashMap<String, ResolvedImport>,
        mut schema: String,
        depth: usize,
    ) -> ZodResult<String> {
        let element_text = self.get_expression_text_for_replacement(&element.expr, source_file);

        let flattened = self.flatten_expression(
            &element.expr,
            source_file,
            imports_map,
            element_text.clone(),
            depth + 1,
        )?;

        if flattened != element_text {
            schema = schema.replace(&element_text, &flattened);
        }
        Ok(schema)
    }

    pub(super) fn flatten_call(
        &mut self,
        call_expression: &swc_ecma_ast::CallExpr,
        source_file: &ParsedFile,
        imports_map: &HashMap<String, ResolvedImport>,
        mut schema: String,
        depth: usize,
    ) -> ZodResult<String> {
        schema = self.flatten_callee_member_if_needed(
            &call_expression.callee,
            source_file,
            imports_map,
            schema,
            depth,
        )?;

        schema = self.flatten_call_arguments(
            &call_expression.args,
            source_file,
            imports_map,
            schema,
            depth,
        )?;

        Ok(schema)
    }

    fn flatten_callee_member_if_needed(
        &mut self,
        callee: &Callee,
        source_file: &ParsedFile,
        imports_map: &HashMap<String, ResolvedImport>,
        mut schema: String,
        depth: usize,
    ) -> ZodResult<String> {
        let Callee::Expr(callee_expression) = callee else {
            return Ok(schema);
        };

        let Expr::Member(member) = &**callee_expression else {
            return Ok(schema);
        };

        let member_text = self.get_expression_text_for_replacement(&member.obj, source_file);
        let is_zod_prefix = member_text.starts_with("z.") || member_text.starts_with("z[");

        if is_zod_prefix {
            return Ok(schema);
        }

        let base_flattened = self.flatten_expression(
            &member.obj,
            source_file,
            imports_map,
            member_text.clone(),
            depth + 1,
        )?;

        if base_flattened != member_text {
            schema = schema.replace(&member_text, &base_flattened);
        }

        Ok(schema)
    }

    fn flatten_call_arguments(
        &mut self,
        arguments: &[swc_ecma_ast::ExprOrSpread],
        source_file: &ParsedFile,
        imports_map: &HashMap<String, ResolvedImport>,
        mut schema: String,
        depth: usize,
    ) -> ZodResult<String> {
        for argument in arguments {
            schema =
                self.flatten_single_argument(argument, source_file, imports_map, schema, depth)?;
        }

        Ok(schema)
    }

    fn flatten_single_argument(
        &mut self,
        argument: &swc_ecma_ast::ExprOrSpread,
        source_file: &ParsedFile,
        imports_map: &HashMap<String, ResolvedImport>,
        mut schema: String,
        depth: usize,
    ) -> ZodResult<String> {
        if let Expr::Array(array_literal) = &*argument.expr {
            return self.flatten_array(array_literal, source_file, imports_map, schema, depth + 1);
        }

        let argument_text = self.get_expression_text_for_replacement(&argument.expr, source_file);

        let flattened = self.flatten_expression(
            &argument.expr,
            source_file,
            imports_map,
            argument_text.clone(),
            depth + 1,
        )?;

        if flattened != argument_text {
            schema = schema.replace(&argument_text, &flattened);
        }

        Ok(schema)
    }

    pub(super) fn flatten_member(
        &mut self,
        member_expression: &swc_ecma_ast::MemberExpr,
        source_file: &ParsedFile,
        imports_map: &HashMap<String, ResolvedImport>,
        mut schema: String,
        depth: usize,
    ) -> ZodResult<String> {
        let object_text =
            self.get_expression_text_for_replacement(&member_expression.obj, source_file);

        let flattened = self.flatten_expression(
            &member_expression.obj,
            source_file,
            imports_map,
            object_text.clone(),
            depth + 1,
        )?;

        if flattened != object_text {
            schema = schema.replace(&object_text, &flattened);
        }

        Ok(schema)
    }

    pub(super) fn get_expression_text_for_replacement(
        &self,
        expression: &Expr,
        source_file: &ParsedFile,
    ) -> String {
        match expression {
            Expr::Ident(identifier) => identifier.sym.to_string(),
            _ => self.get_source_text(source_file, self.get_expression_span(expression)),
        }
    }
}
