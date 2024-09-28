import { Node, Project, SourceFile, Type } from 'ts-morph';
import {
  ProcedureGeneratorMetadata,
  SourceFileImportsMap,
} from '../interfaces/generator.interface';
import * as path from 'node:path';

export function findCtxOutProperty(type: Type): string | undefined {
  const typeText = type.getText();
  const ctxOutMatch = typeText.match(/_ctx_out:\s*{([^}]*)}/);

  return ctxOutMatch ? ctxOutMatch[1].trim() : undefined;
}

export function generateProcedureString(
  procedure: ProcedureGeneratorMetadata,
): string {
  const { name, decorators } = procedure;
  const decorator = decorators.find(
    (d) => d.name === 'Mutation' || d.name === 'Query',
  );

  if (!decorator) {
    return '';
  }

  const decoratorArgumentsArray = Object.entries(decorator.arguments)
    .map(([key, value]) => `.${key}(${value})`)
    .join('');

  return `${name}: publicProcedure${decoratorArgumentsArray}.${decorator.name.toLowerCase()}(async () => "PLACEHOLDER_DO_NOT_REMOVE" as any )`;
}

function buildSourceFileImportsMap(
  sourceFile: SourceFile,
  project: Project,
): Map<string, SourceFileImportsMap> {
  const sourceFileImportsMap = new Map<string, SourceFileImportsMap>();
  const importDeclarations = sourceFile.getImportDeclarations();

  for (const importDeclaration of importDeclarations) {
    const namedImports = importDeclaration.getNamedImports();
    for (const namedImport of namedImports) {
      const name = namedImport.getName();
      const moduleSpecifier = importDeclaration.getModuleSpecifierValue();
      const resolvedPath = path.resolve(
        path.dirname(sourceFile.getFilePath()),
        moduleSpecifier + '.ts',
      );
      const importedSourceFile =
        project.addSourceFileAtPathIfExists(resolvedPath);
      if (!importedSourceFile) continue;

      const schemaVariable = importedSourceFile.getVariableDeclaration(name);
      if (schemaVariable) {
        const initializer = schemaVariable.getInitializer();
        if (initializer) {
          sourceFileImportsMap.set(name, {
            initializer,
            sourceFile: importedSourceFile,
          });
        }
      }
    }
  }

  return sourceFileImportsMap;
}

export function flattenZodSchema(
  node: Node,
  sourceFile: SourceFile,
  project: Project,
  schema: string,
): string {
  const importsMap = buildSourceFileImportsMap(sourceFile, project);
  if (Node.isIdentifier(node)) {
    const identifierName = node.getText();
    const identifierDeclaration =
      sourceFile.getVariableDeclaration(identifierName);

    if (identifierDeclaration != null) {
      const identifierInitializer = identifierDeclaration.getInitializer();

      if (identifierInitializer != null) {
        const identifierSchema = flattenZodSchema(
          identifierInitializer,
          sourceFile,
          project,
          identifierInitializer.getText(),
        );

        schema = schema.replace(identifierName, identifierSchema);
      }
    } else if (importsMap.has(identifierName)) {
      const importedIdentifier = importsMap.get(identifierName);

      if (importedIdentifier != null) {
        const { initializer } = importedIdentifier;
        const identifierSchema = flattenZodSchema(
          initializer,
          importedIdentifier.sourceFile,
          project,
          initializer.getText(),
        );

        schema = schema.replace(identifierName, identifierSchema);
      }
    }
  } else if (Node.isObjectLiteralExpression(node)) {
    for (const property of node.getProperties()) {
      if (Node.isPropertyAssignment(property)) {
        const propertyText = property.getText();
        const propertyInitializer = property.getInitializer();

        if (propertyInitializer != null) {
          schema = schema.replace(
            propertyText,
            flattenZodSchema(
              propertyInitializer,
              sourceFile,
              project,
              propertyText,
            ),
          );
        }
      }
    }
  } else if (Node.isArrayLiteralExpression(node)) {
    for (const element of node.getElements()) {
      const elementText = element.getText();
      schema = schema.replace(
        elementText,
        flattenZodSchema(element, sourceFile, project, elementText),
      );
    }
  } else if (Node.isCallExpression(node)) {
    const expression = node.getExpression();
    if (
      Node.isPropertyAccessExpression(expression) &&
      !expression.getText().startsWith('z')
    ) {
      const baseSchema = flattenZodSchema(
        expression,
        sourceFile,
        project,
        expression.getText(),
      );
      const propertyName = expression.getName();
      schema = schema.replace(
        expression.getText(),
        `${baseSchema}.${propertyName}`,
      );
    }
    for (const arg of node.getArguments()) {
      const argText = arg.getText();
      schema = schema.replace(
        argText,
        flattenZodSchema(arg, sourceFile, project, argText),
      );
    }
  } else if (Node.isPropertyAccessExpression(node)) {
    schema = flattenZodSchema(
      node.getExpression(),
      sourceFile,
      project,
      node.getExpression().getText(),
    );
  }

  return schema;
}
