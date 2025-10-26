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
    const importsByModule = new Map<string, Set<string>>();

    for (const schemaImportName of schemaImportNames) {
      const importMapMetadata = importsMap.get(schemaImportName);

      if (importMapMetadata == null) {
        continue;
      }

      // Handle external/workspace imports (e.g., @repo/trpc/schemas)
      if (importMapMetadata.moduleSpecifier != null) {
        if (!importsByModule.has(importMapMetadata.moduleSpecifier)) {
          importsByModule.set(importMapMetadata.moduleSpecifier, new Set());
        }
        importsByModule.get(importMapMetadata.moduleSpecifier)!.add(schemaImportName);
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

        if (!importsByModule.has(moduleSpecifier)) {
          importsByModule.set(moduleSpecifier, new Set());
        }
        importsByModule.get(moduleSpecifier)!.add(schemaImportName);
      }
    }

    // Merge with existing imports or create new ones
    for (const [moduleSpecifier, namedImportsSet] of importsByModule) {
      const existingImport = sourceFile
        .getImportDeclarations()
        .find((imp) => imp.getModuleSpecifierValue() === moduleSpecifier);

      if (existingImport) {
        // Add to existing import declaration
        const existingNamedImports = existingImport
          .getNamedImports()
          .map((ni) => ni.getName());

        for (const namedImport of namedImportsSet) {
          if (!existingNamedImports.includes(namedImport)) {
            existingImport.addNamedImport(namedImport);
          }
        }
      } else {
        // Create new import declaration
        sourceFile.addImportDeclaration({
          kind: StructureKind.ImportDeclaration,
          moduleSpecifier,
          namedImports: Array.from(namedImportsSet),
        });
      }
    }
  }

  public findCtxOutProperty(type: Type): string | undefined {
    const typeText = type.getText();
    const ctxOutMatch = typeText.match(/_ctx_out:\s*{([^}]*)}/);

    return ctxOutMatch ? ctxOutMatch[1].trim() : undefined;
  }
}
