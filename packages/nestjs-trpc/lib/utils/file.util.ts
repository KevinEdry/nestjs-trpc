import {
  SourceFile,
  StructureKind,
  VariableDeclarationKind,
  Expression,
  SyntaxKind,
  Decorator,
  Project,
} from 'ts-morph';
import { flattenZodSchema } from './type.util';

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
