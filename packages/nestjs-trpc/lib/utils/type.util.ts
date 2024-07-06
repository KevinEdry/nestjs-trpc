import { Node, SourceFile, Type } from 'ts-morph';
import { ProcedureGeneratorMetadata, SourceFileImportsMap } from '../interfaces/generator.interface';

export function findCtxOutProperty(type: Type): string | undefined {
  const typeText = type.getText();
  const ctxOutMatch = typeText.match(/_ctx_out:\s*{([^}]*)}/);

  return ctxOutMatch ? ctxOutMatch[1].trim() : undefined;
}

export function generateProcedureString(procedure: ProcedureGeneratorMetadata): string {
  const { name, decorators } = procedure;
  const decorator = decorators.find(d => d.name === 'Mutation' || d.name === 'Query');

  if (!decorator) {
    return '';
  }

  const decoratorArgumentsArray = Object.entries(decorator.arguments)
    .map(([key, value]) => `.${key}(${value})`)
    .join('');

  return `${name}: publicProcedure${decoratorArgumentsArray}.${decorator.name.toLowerCase()}(async () => "PLACEHOLDER_DO_NOT_REMOVE" as any )`;
}

export function flattenZodSchema(
  node: Node,
  importsMap: Map<string, SourceFileImportsMap>,
  sourceFile: SourceFile,
  schema: string,
): string {
  if (Node.isIdentifier(node)) {
    const identifierName = node.getText();
    const identifierDeclaration = sourceFile.getVariableDeclaration(identifierName);

    if (identifierDeclaration) {
      const identifierInitializer = identifierDeclaration.getInitializer();
      const identifierSchema = flattenZodSchema(
        identifierInitializer,
        importsMap,
        sourceFile,
        identifierInitializer.getText(),
      );

      schema = schema.replace(identifierName, identifierSchema);
    } else if (importsMap.has(identifierName)) {
      const importedIdentifier = importsMap.get(identifierName);
      const { initializer } = importedIdentifier;
      const identifierSchema = flattenZodSchema(
        initializer,
        importsMap,
        importedIdentifier.sourceFile,
        initializer.getText(),
      );

      schema = schema.replace(identifierName, identifierSchema);
    }
  } else if (Node.isObjectLiteralExpression(node)) {
    for (const property of node.getProperties()) {
      if (Node.isPropertyAssignment(property)) {
        const propertyText = property.getText();
        schema = schema.replace(
          propertyText,
          flattenZodSchema(
            property.getInitializer(),
            importsMap,
            sourceFile,
            propertyText,
          ),
        );
      }
    }
  } else if (Node.isArrayLiteralExpression(node)) {
    for (const element of node.getElements()) {
      const elementText = element.getText();
      schema = schema.replace(
        elementText,
        flattenZodSchema(element, importsMap, sourceFile, elementText),
      );
    }
  } else if (Node.isCallExpression(node)) {
    for (const arg of node.getArguments()) {
      const argText = arg.getText();
      schema = schema.replace(
        argText,
        flattenZodSchema(arg, importsMap, sourceFile, argText),
      );
    }
  } else if (Node.isPropertyAccessExpression(node)) {
    schema = flattenZodSchema(
      node.getExpression(),
      importsMap,
      sourceFile,
      node.getExpression().getText(),
    );
  }

  return schema;
}