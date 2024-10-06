import {
  SourceFile,
  StructureKind,
  VariableDeclarationKind,
  Expression,
  SyntaxKind,
  Decorator,
  Project,
  ImportDeclarationStructure,
} from 'ts-morph';
import { flattenZodSchema } from './type.util';
import { SourceFileImportsMap } from '../interfaces/generator.interface';
import * as path from 'node:path';

export function generateStaticDeclaration(sourceFile: SourceFile): void {
  sourceFile.addImportDeclaration({
    kind: StructureKind.ImportDeclaration,
    moduleSpecifier: '@trpc/server',
    namedImports: ['initTRPC'],
  });
  sourceFile.addImportDeclaration({
    kind: StructureKind.ImportDeclaration,
    moduleSpecifier: 'zod',
    namedImports: ['z'],
  });

  sourceFile.addVariableStatements([
    {
      declarationKind: VariableDeclarationKind.Const,
      declarations: [{ name: 't', initializer: 'initTRPC.create()' }],
    },
    {
      declarationKind: VariableDeclarationKind.Const,
      declarations: [{ name: 'publicProcedure', initializer: 't.procedure' }],
    },
  ]);
}

export function addSchemaImports(
  sourceFile: SourceFile,
  schemaImportNames: Array<string>,
  importsMap: Map<string, SourceFileImportsMap>,
): void {
  const importDeclarations: ImportDeclarationStructure[] = [];

  for (const schemaImportName of schemaImportNames) {
    for (const [importMapKey, importMapMetadata] of importsMap.entries()) {
      if (schemaImportName == null || importMapKey !== schemaImportName) {
        continue;
      }

      const relativePath = path.relative(
        path.dirname(sourceFile.getFilePath()),
        importMapMetadata.sourceFile.getFilePath().replace(/\.ts$/, ''),
      );

      importDeclarations.push({
        kind: StructureKind.ImportDeclaration,
        moduleSpecifier: relativePath.startsWith('.')
          ? relativePath
          : `./${relativePath}`,
        namedImports: [schemaImportName],
      });
    }
  }

  sourceFile.addImportDeclarations(importDeclarations);
}

export async function saveOrOverrideFile(
  sourceFile: SourceFile,
): Promise<void> {
  sourceFile.formatText({ indentSize: 2 });
  await sourceFile.save();
}

export function getDecoratorPropertyValue(
  decorator: Decorator,
  propertyName: string,
  sourceFile: SourceFile,
  project: Project,
): string | null {
  const args = decorator.getArguments();

  for (const arg of args) {
    if (arg.getKind() === SyntaxKind.ObjectLiteralExpression) {
      const properties = (arg as any).getProperties();
      const property = properties.find(
        (p: any) => p.getName() === propertyName,
      );

      if (!property) {
        return null;
      }

      const propertyInitializer: Expression = property.getInitializer();
      return flattenZodSchema(
        propertyInitializer,
        sourceFile,
        project,
        propertyInitializer.getText(),
      );
    }
  }

  return null;
}
