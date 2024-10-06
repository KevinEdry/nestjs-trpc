import { Injectable } from '@nestjs/common';
import { Project, SourceFile } from 'ts-morph';
import { SourceFileImportsMap } from '../interfaces/generator.interface';

@Injectable()
export class ImportsScanner {
  public buildSourceFileImportsMap(
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
            ? this.resolveBarrelFileImport(importedSourceFile, name, project)
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

  /**
   * https://github.com/dsherret/ts-morph/issues/327
   * Note that if the module resolution of the compiler is Classic then it won't resolve those implicit index.ts module specifiers.
   * So for example, if the moduleResolution compiler option isn't explicitly set then setting the module
   * compiler option to anything but ModuleKind.CommonJS will cause the module resolution kind to resolve to Classic.
   * Additionally, if moduleResolution and the module compiler option isn't set,
   * then a script target of ES2015 and above will also use Classic module resolution.
   */
  private resolveBarrelFileImport(
    barrelSourceFile: SourceFile,
    name: string,
    project: Project,
  ): SourceFile | undefined {
    // Traverse through export declarations to find the actual source of the named import
    for (const exportDeclaration of barrelSourceFile.getExportDeclarations()) {
      const exportedSourceFile =
        exportDeclaration.getModuleSpecifierSourceFile();
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
          const baseSourceFile = this.resolveBarrelFileImport(
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
}
