import { Decorator, SourceFile, Project } from 'ts-morph';
import {
  DecoratorGeneratorMetadata,
  SourceFileImportsMap,
} from '../interfaces/generator.interface';
import { getDecoratorPropertyValue } from '../utils/file.util';
import { ConsoleLogger, Inject, Injectable } from '@nestjs/common';
import * as path from 'node:path';
import { TRPC_MODULE_OPTIONS } from '../trpc.constants';
import { TRPCModuleOptions } from '../interfaces';

@Injectable()
export class DecoratorGenerator {
  constructor(
    @Inject(ConsoleLogger) private readonly consoleLogger: ConsoleLogger,
    @Inject(TRPC_MODULE_OPTIONS) private readonly options: TRPCModuleOptions,
  ) {}

  public serializeProcedureDecorators(
    decorators: Decorator[],
    sourceFile: SourceFile,
    project: Project,
  ): DecoratorGeneratorMetadata[] {
    const sourceFileImportsMap = this.buildSourceFileImportsMap(
      sourceFile,
      project,
    );
    return decorators.reduce<DecoratorGeneratorMetadata[]>(
      (array, decorator) => {
        const decoratorName = decorator.getName();

        if (decoratorName === 'Query' || decoratorName === 'Mutation') {
          const input = getDecoratorPropertyValue(
            decorator,
            'input',
            sourceFile,
            sourceFileImportsMap,
          );
          const output = getDecoratorPropertyValue(
            decorator,
            'output',
            sourceFile,
            sourceFileImportsMap,
          );

          array.push({
            name: decoratorName,
            arguments: {
              ...(input ? { input } : {}),
              ...(output ? { output } : {}),
            },
          });
        } else if (decoratorName === 'Middlewares') {
          return array;
        } else {
          this.consoleLogger.warn(`Decorator ${decoratorName}, not supported.`);
        }

        return array;
      },
      [],
    );
  }

  private buildSourceFileImportsMap(
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
}
