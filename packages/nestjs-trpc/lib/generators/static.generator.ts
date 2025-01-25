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
import type { RootConfigTypes } from '@trpc/server/dist/core/internals/config';

@Injectable()
export class StaticGenerator {
  public generateStaticDeclaration(
    sourceFile: SourceFile,
    transformer?: RootConfigTypes['transformer'],
  ): void {
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

    if (transformer != null)
      sourceFile.addImportDeclaration({
        kind: StructureKind.ImportDeclaration,
        moduleSpecifier: 'superjson',
        defaultImport: 'superjson',
      });

    sourceFile.addVariableStatements([
      {
        declarationKind: VariableDeclarationKind.Const,
        declarations: [
          {
            name: 't',
            initializer: transformer
              ? 'initTRPC.create({ transformer: superjson })'
              : 'initTRPC.create()',
          },
        ],
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

  public findCtxOutProperty(type: Type): string | undefined {
    const typeText = type.getText();
    const ctxOutMatch = typeText.match(/_ctx_out:\s*{([^}]*)}/);

    return ctxOutMatch ? ctxOutMatch[1].trim() : undefined;
  }
}
