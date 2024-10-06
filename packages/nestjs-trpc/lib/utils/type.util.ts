import { Node, Project, SourceFile, Type } from 'ts-morph';
import {
  ProcedureGeneratorMetadata,
  SourceFileImportsMap,
} from '../interfaces/generator.interface';

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
    (decorator) => decorator.name === 'Mutation' || decorator.name === 'Query',
  );

  if (!decorator) {
    return '';
  }

  const decoratorArgumentsArray = Object.entries(decorator.arguments)
    .map(([key, value]) => `.${key}(${value})`)
    .join('');

  return `${name}: publicProcedure${decoratorArgumentsArray}.${decorator.name.toLowerCase()}(async () => "PLACEHOLDER_DO_NOT_REMOVE" as any )`;
}

/**
 * https://github.com/dsherret/ts-morph/issues/327
 * Note that if the module resolution of the compiler is Classic then it won't resolve those implicit index.ts module specifiers.
 * So for example, if the moduleResolution compiler option isn't explicitly set then setting the module
 * compiler option to anything but ModuleKind.CommonJS will cause the module resolution kind to resolve to Classic.
 * Additionally, if moduleResolution and the module compiler option isn't set,
 * then a script target of ES2015 and above will also use Classic module resolution.
 */
function resolveBarrelFileImport(
  barrelSourceFile: SourceFile,
  name: string,
  project: Project,
): SourceFile | undefined {
  // Traverse through export declarations to find the actual source of the named import
  for (const exportDeclaration of barrelSourceFile.getExportDeclarations()) {
    const exportedSourceFile = exportDeclaration.getModuleSpecifierSourceFile();
    if (exportedSourceFile == null) continue;

    // Check if the named export is explicitly re-exported
    const namedExports = exportDeclaration.getNamedExports();
    if (namedExports.length > 0) {
      const matchingExport = namedExports.find((e) => e.getName() === name);
      if (matchingExport) {
        return exportedSourceFile;
      }
    } else {
      // Handle `export * from ...` case: recursively resolve the export
      const schemaVariable = exportedSourceFile.getVariableDeclaration(name);
      if (schemaVariable) {
        return exportedSourceFile;
      } else {
        // Continue resolving if it's another barrel file
        const baseSourceFile = resolveBarrelFileImport(
          exportedSourceFile,
          name,
          project,
        );
        if (baseSourceFile) return baseSourceFile;
      }
    }
  }

  return undefined;
}

export function buildSourceFileImportsMap(
  sourceFile: SourceFile,
  project: Project,
): Map<string, SourceFileImportsMap> {
  const sourceFileImportsMap = new Map<string, SourceFileImportsMap>();
  const importDeclarations = sourceFile.getImportDeclarations();

  for (const importDeclaration of importDeclarations) {
    const namedImports = importDeclaration.getNamedImports();
    for (const namedImport of namedImports) {
      const name = namedImport.getName();
      const importedSourceFile =
        importDeclaration.getModuleSpecifierSourceFile();

      if (importedSourceFile == null) {
        continue;
      }

      const resolvedSourceFile =
        importedSourceFile.getFilePath().endsWith('index.ts') &&
        !importedSourceFile.getVariableDeclaration(name)
          ? resolveBarrelFileImport(importedSourceFile, name, project)
          : importedSourceFile;

      if (resolvedSourceFile == null) {
        continue;
      }

      // Generalized logic to handle various kinds of declarations
      const declaration =
        resolvedSourceFile.getVariableDeclaration(name) ||
        resolvedSourceFile.getClass(name) ||
        resolvedSourceFile.getInterface(name) ||
        resolvedSourceFile.getEnum(name) ||
        resolvedSourceFile.getFunction(name);

      if (declaration != null) {
        const initializer =
          'getInitializer' in declaration
            ? declaration.getInitializer()
            : declaration;
        sourceFileImportsMap.set(name, {
          initializer: initializer ?? declaration,
          sourceFile: resolvedSourceFile,
        });
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
