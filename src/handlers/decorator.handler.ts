import { ClassDeclaration, Decorator, SourceFile, Node, Project } from 'ts-morph';
import { DecoratorGeneratorMetadata, SourceFileImportsMap } from '../interfaces/generator.interface';
import { findCtxOutProperty } from '../utils/type.util';
import { getDecoratorPropertyValue } from '../utils/file.util';
import { ConsoleLogger, Inject, Injectable } from '@nestjs/common';
import * as path from 'node:path';
import { TRPC_MODULE_OPTIONS } from '../trpc.constants';
import { TRPCModuleOptions } from '../interfaces';

@Injectable()
export class DecoratorHandler {

  constructor(
    @Inject(ConsoleLogger) private readonly consoleLogger: ConsoleLogger,
    @Inject(TRPC_MODULE_OPTIONS) private readonly options: TRPCModuleOptions,
  ) {}

  public serializeProcedureDecorators(decorators: Decorator[], sourceFile: SourceFile, project: Project): DecoratorGeneratorMetadata[] {
    const sourceFileImportsMap = this.buildSourceFileImportsMap(sourceFile, project);
    return decorators.reduce<DecoratorGeneratorMetadata[]>((array, decorator) => {
      const decoratorName = decorator.getName();

      if (decoratorName === 'Query' || decoratorName === 'Mutation') {
        const input = getDecoratorPropertyValue(decorator, 'input', sourceFile, sourceFileImportsMap);
        const output = getDecoratorPropertyValue(decorator, 'output', sourceFile, sourceFileImportsMap);

        array.push({ name: decoratorName, arguments: { ...(input ? { input } : {}), ...(output ? { output } : {}) } });
      } else if (decoratorName === 'Procedure') {
        const generatedType = this.handleProcedureDecorator(decorator, project);
        if (generatedType) {

          // Need to do this in a seperate file
          console.log({ generatedType, sourceFilePath: sourceFile.getFilePath(), path: path.resolve(path.dirname(this.options.autoSchemaFile)) });
        }
      } else {
        this.consoleLogger.warn(`Decorator ${decoratorName}, not supported.`);
      }

      return array;
    }, []);
  }

  private handleProcedureDecorator(decorator: Decorator, project: Project): string | null {
    const argument = decorator.getArguments()[0];
    if (!Node.isIdentifier(argument)) {
      return null;
    }

    const symbol = argument.getSymbol();
    if (!symbol) {
      return null;
    }

    const declaration = symbol.getDeclarations()[0];
    const classDeclaration = this.resolveClassDeclaration(declaration, project);

    if (!classDeclaration) {
      return null;
    }

    const useProperty = classDeclaration.getProperty('use');
    if (!useProperty) {
      return null;
    }

    const useMethodType = useProperty.getType();
    const callSignatures = useMethodType.getCallSignatures();

    if (callSignatures.length === 0) {
      return null;
    }

    const returnType = callSignatures[0].getReturnType();
    const typeArguments = returnType.getTypeArguments();

    if (typeArguments.length === 0) {
      return null;
    }

    const nextParamType = typeArguments[0];
    const ctxOutType = findCtxOutProperty(nextParamType);

    return ctxOutType ? `export type ProtectedProcedureContext = { ${ctxOutType} }` : null;
  }

  private resolveClassDeclaration(declaration: Node, project: Project): ClassDeclaration | undefined {
    if (Node.isImportSpecifier(declaration)) {
      const importDeclaration = declaration.getImportDeclaration();
      const moduleSpecifier = importDeclaration.getModuleSpecifierValue();
      const sourceFile = declaration.getSourceFile();
      const resolvedPath = path.resolve(path.dirname(sourceFile.getFilePath()), moduleSpecifier + '.ts');
      const importedSourceFile = project.addSourceFileAtPathIfExists(resolvedPath);

      return importedSourceFile ? importedSourceFile.getClass(declaration.getName()) : undefined;
    } else if (Node.isClassDeclaration(declaration)) {
      return declaration;
    }

    return undefined;
  }

  private buildSourceFileImportsMap(sourceFile: SourceFile, project: Project): Map<string, SourceFileImportsMap> {
    const sourceFileImportsMap = new Map<string, SourceFileImportsMap>();
    const importDeclarations = sourceFile.getImportDeclarations();

    for (const importDeclaration of importDeclarations) {
      const namedImports = importDeclaration.getNamedImports();
      for (const namedImport of namedImports) {
        const name = namedImport.getName();
        const moduleSpecifier = importDeclaration.getModuleSpecifierValue();
        const resolvedPath = path.resolve(path.dirname(sourceFile.getFilePath()), moduleSpecifier + '.ts');
        const importedSourceFile = project.addSourceFileAtPathIfExists(resolvedPath);
        if (!importedSourceFile) continue;

        const schemaVariable = importedSourceFile.getVariableDeclaration(name);
        if (schemaVariable) {
          const initializer = schemaVariable.getInitializer();
          if (initializer) {
            sourceFileImportsMap.set(name, { initializer, sourceFile: importedSourceFile });
          }
        }
      }
    }

    return sourceFileImportsMap;
  }
}