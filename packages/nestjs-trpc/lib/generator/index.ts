import {
  Decorator,
  SourceFile,
  StructureKind,
  SyntaxKind,
  VariableDeclarationKind,
} from 'ts-morph';
import * as path from 'node:path';
import { project } from './project';
import {
  ProcedureInstance,
  RoutersMetadata,
} from '../interfaces/factory.interface';
import { locate } from 'func-loc';

interface RouterMetadata {
  name: string;
  procedures: Array<ProcedureMetadata>;
}

interface ProcedureMetadata {
  name: string;
  decorators: Array<DecoratorMetadata>;
}

interface DecoratorMetadata {
  name: 'Query' | 'Mutation';
  arguments: {
    input?: string;
    output?: string;
  };
}

function resolveSchema(schemaName: string, sourceFile: SourceFile): string {
  const schemaVariable = sourceFile.getVariableDeclaration(schemaName);
  if (schemaVariable) {
    const initializer = schemaVariable.getInitializer();
    return initializer.getText();
  }
  return schemaName;
}

export async function generateTRPCRoutes(
  routers: Array<RoutersMetadata>,
  outputDirPath: string,
) {
  const appRouter = project.createSourceFile(
    path.resolve(outputDirPath, 'trpc.ts'),
    undefined,
    { overwrite: true },
  );

  appRouter.addImportDeclaration({
    kind: StructureKind.ImportDeclaration,
    moduleSpecifier: '@trpc/server',
    namedImports: ['initTRPC'],
  });
  appRouter.addImportDeclaration({
    kind: StructureKind.ImportDeclaration,
    moduleSpecifier: 'zod',
    namedImports: ['z'],
  });

  appRouter.addVariableStatements([
    {
      declarationKind: VariableDeclarationKind.Const,
      declarations: [{ name: 't', initializer: 'initTRPC.create()' }],
    },
    {
      declarationKind: VariableDeclarationKind.Const,
      declarations: [{ name: 'publicProcedure', initializer: 't.procedure' }],
    },
  ]);

  const routersMetadata = await Promise.all(
    routers.map((router) => routerHandler(router)),
  );

  const routersDeclaration: string = routersMetadata
    .map((router) => {
      const { name, procedures } = router;
      return `${name}: { ${procedures
        .map((procedure) => {
          const { name, decorators } = procedure;

          const decorator = decorators.find(
            (decorator) =>
              decorator.name === 'Mutation' || decorator.name === 'Query',
          );

          const decoratorArgumentsArray = Object.entries(decorator.arguments)
            .map(([key, value]) => `${key}(${value})`)
            .join('.');

          return `${name}: publicProcedure.${decoratorArgumentsArray}.${decorator.name.toLowerCase()}(async () => "PLACEHOLDER_DO_NOT_REMOVE" as any )`;
        })
        .join(',\n')} }`;
    })
    .join(',\n');

  appRouter.addStatements(/* ts */ `
    const appRouter = t.router({${routersDeclaration}});
    export type AppRouter = typeof appRouter;
    `);
  appRouter.formatText({
    indentSize: 2,
  });
  console.log('saving ts-morph');
  await appRouter.save();
}

async function routerHandler(router: RoutersMetadata): Promise<RouterMetadata> {
  const proceduresMetadata = await Promise.all(
    router.procedures.map(async (procedure) =>
      procedureHandler(procedure, router.name),
    ),
  );

  return {
    name: router.name,
    procedures: proceduresMetadata,
  };
}

function decoratorsHandler(
  decorators: Array<Decorator>,
  sourceFile: SourceFile,
): Array<DecoratorMetadata> {
  const decoratorsMetadata: Array<DecoratorMetadata> = decorators.map(
    (decorator) => {
      const decoratorName = decorator.getName();
      const args = decorator.getArguments();

      let inputSchema = '';
      let outputSchema = '';

      if (decoratorName === 'Query' || decoratorName === 'Mutation') {
        for (const arg of args) {
          if (arg.getKind() === SyntaxKind.ObjectLiteralExpression) {
            /* @ts-ignore */
            const properties = arg.getProperties();

            for (const prop of properties) {
              const propName = prop.getName();
              const propValue = prop.getInitializer().getText();

              if (propName === 'input') {
                inputSchema = resolveSchema(propValue, sourceFile);
              } else if (propName === 'output') {
                outputSchema = resolveSchema(propValue, sourceFile);
              }
            }
          }
        }
      } else {
        return null;
      }

      return {
        name: decoratorName,
        arguments: {
          ...(inputSchema != '' ? { input: inputSchema } : {}),
          ...(outputSchema != '' ? { output: outputSchema } : {}),
        },
      };
    },
  );

  return decoratorsMetadata;
}

async function procedureHandler(
  procedure: ProcedureInstance,
  routerName: string,
): Promise<ProcedureMetadata> {
  const location = await locate(procedure.implementation, { sourceMap: true });
  const sourceFile = project.addSourceFileAtPath(location.path);

  const classDeclaration = sourceFile.getClass(routerName);
  if (classDeclaration == null) {
    return null;
  }

  const methodDeclaration = classDeclaration.getMethod(procedure.name);
  if (methodDeclaration == null) {
    return null;
  }

  const decorators = methodDeclaration.getDecorators();
  if (decorators == null) {
    return null;
  }

  const deco = decoratorsHandler(decorators, sourceFile);

  return {
    name: procedure.name,
    decorators: deco,
  };
}
