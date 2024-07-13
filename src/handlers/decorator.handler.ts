import {
  ClassDeclaration,
  Decorator,
  SourceFile,
  Node,
  Project,
  MethodDeclaration,
  Type,
  SyntaxKind,
} from 'ts-morph';
import {
  DecoratorGeneratorMetadata,
  SourceFileImportsMap,
} from '../interfaces/generator.interface';
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
          const generatedType = this.handleMiddlewaresDecorator(
            decorator,
            project,
          );
          if (generatedType) {
            // TODO: Need to do this in a seperate fi
            console.log({
              generatedType,
              sourceFilePath: sourceFile.getFilePath(),
              path: path.resolve(path.dirname(this.options.autoSchemaFile)),
            });
          }
        } else {
          this.consoleLogger.warn(`Decorator ${decoratorName}, not supported.`);
        }

        return array;
      },
      [],
    );
  }

  private handleMiddlewaresDecorator(
    decorator: Decorator,
    project: Project,
  ): string | null {
    const argument = decorator.getArguments()[0];
    if (!Node.isIdentifier(argument)) {
      return null;
    }

    const symbol = argument.getSymbol();
    if (!symbol) {
      return null;
    }

    const declaration = symbol.getDeclarations()[0];
    const className = declaration.getText();
    const classDeclaration = this.resolveClassDeclaration(declaration, project);

    if (!classDeclaration) {
      return null;
    }

    const useMethod = classDeclaration.getMethod('use');
    if (!useMethod) {
      return null;
    }

    const ctxType = this.extractCtxTypeFromUseMethod(useMethod);
    if (!ctxType) {
      return null;
    }

    console.log({ ctxType: ctxType.getText() });

    return `export type ${className}Context = ${ctxType.getText()}`;
  }

  private extractCtxTypeFromUseMethod(
    useMethod: MethodDeclaration,
  ): Type | null {
    const body = useMethod.getBody();
    if (!body) return null;

    // Find the call to opts.next()
    const nextCall = body
      .getDescendantsOfKind(SyntaxKind.CallExpression)
      .find((call) => {
        const expression = call.getExpression();
        return (
          Node.isPropertyAccessExpression(expression) &&
          expression.getName() === 'next' &&
          Node.isIdentifier(expression.getExpression()) &&
          expression.getExpression().getText() === 'opts'
        );
      });

    if (!nextCall) return null;

    // Get the argument passed to opts.next()
    const nextArg = nextCall.getArguments()[0];
    if (!Node.isObjectLiteralExpression(nextArg)) return null;

    // Find the 'ctx' property in the argument
    const ctxProperty = nextArg
      .getProperties()
      .find(
        (prop) => Node.isPropertyAssignment(prop) && prop.getName() === 'ctx',
      );

    if (!Node.isPropertyAssignment(ctxProperty)) return null;

    // Get the type of the 'ctx' property value
    return ctxProperty.getInitializer()?.getType() || null;
  }

  private resolveClassDeclaration(
    declaration: Node,
    project: Project,
  ): ClassDeclaration | undefined {
    if (Node.isImportSpecifier(declaration)) {
      const importDeclaration = declaration.getImportDeclaration();
      const moduleSpecifier = importDeclaration.getModuleSpecifierValue();
      const sourceFile = declaration.getSourceFile();
      const resolvedPath = path.resolve(
        path.dirname(sourceFile.getFilePath()),
        moduleSpecifier + '.ts',
      );
      const importedSourceFile =
        project.addSourceFileAtPathIfExists(resolvedPath);

      return importedSourceFile
        ? importedSourceFile.getClass(declaration.getName())
        : undefined;
    } else if (Node.isClassDeclaration(declaration)) {
      return declaration;
    }

    return undefined;
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
