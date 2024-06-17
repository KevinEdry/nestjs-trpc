import { Project, StructureKind, VariableDeclarationKind } from 'ts-morph';
import path from 'path';
import { project } from './project';
import { RoutersMetadata } from '../interfaces/factory.interface';
import util from 'util';

export async function generateTRPCRoutes(
  routersDef: Array<RoutersMetadata>,
  outputPath: string,
) {
  const appRouter = project.createSourceFile(
    path.resolve(outputPath, 'trpc.ts'),
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

  const routerStatements = routersDef
    .map((route) => {
      const proceduresDef = route.procedures
        .map((procedure) => {
          console.log({ output: util.inspect(procedure.output) });
          return `${procedure.name}: publicProcedure
        .input(${procedure.input})
        .output(${procedure.output})
        .${procedure.type.toLowerCase()}(${procedure.implementation})`;
        })
        .join(',\n');

      return `${route.name}: {\n${proceduresDef}\n}`;
    })
    .join(',\n');
  appRouter.addStatements(/* ts */ `
    const appRouter = t.router({${routerStatements}});
    export type AppRouter = typeof appRouter;
    `);
  appRouter.formatText({
    indentSize: 2,
  });
  console.log('saving ts-morph');
  await appRouter.save();
}
