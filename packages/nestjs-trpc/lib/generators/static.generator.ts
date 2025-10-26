import {
  ImportDeclarationStructure,
  SourceFile,
  StructureKind,
  Type,
  VariableDeclarationKind,
} from 'ts-morph';
import { Injectable } from '@nestjs/common';
import { SourceFileImportsMap } from '../interfaces/generator.interface';
import * as path from 'node:path';

@Injectable()
export class StaticGenerator {
  public generateStaticDeclaration(sourceFile: SourceFile): void {
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

  public addSchemaImports(
    sourceFile: SourceFile,
    schemaImportNames: Array<string>,
    importsMap: Map<string, SourceFileImportsMap>,
  ): void {
    // Group imports by their module specifier
    const importsByModule = new Map<string, string[]>();

    for (const schemaImportName of schemaImportNames) {
      const importMapMetadata = importsMap.get(schemaImportName);

      if (importMapMetadata == null) {
        continue;
      }

      // Handle external/workspace imports (e.g., @repo/trpc/schemas)
      if (importMapMetadata.moduleSpecifier != null) {
        const existing = importsByModule.get(importMapMetadata.moduleSpecifier) || [];
        existing.push(schemaImportName);
        importsByModule.set(importMapMetadata.moduleSpecifier, existing);
        continue;
      }

      // Handle local imports with relative paths
      if (importMapMetadata.sourceFile != null) {
        const relativePath = path.relative(
          path.dirname(sourceFile.getFilePath()),
          importMapMetadata.sourceFile.getFilePath().replace(/\.ts$/, ''),
        );

        const moduleSpecifier = relativePath.startsWith('.')
          ? relativePath
          : `./${relativePath}`;

        const existing = importsByModule.get(moduleSpecifier) || [];
        existing.push(schemaImportName);
        importsByModule.set(moduleSpecifier, existing);
      }
    }

    // Generate import declarations grouped by module
    const importDeclarations: ImportDeclarationStructure[] = [];
    for (const [moduleSpecifier, namedImports] of importsByModule) {
      importDeclarations.push({
        kind: StructureKind.ImportDeclaration,
        moduleSpecifier,
        namedImports,
      });
    }

    sourceFile.addImportDeclarations(importDeclarations);
  }

  public findCtxOutProperty(type: Type): string | undefined {
    const typeText = type.getText();
    const ctxOutMatch = typeText.match(/_ctx_out:\s*{([^}]*)}/);

    return ctxOutMatch ? ctxOutMatch[1].trim() : undefined;
  }
}
