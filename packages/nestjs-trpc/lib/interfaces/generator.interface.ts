import {
  ClassDeclaration,
  EnumDeclaration,
  Expression,
  FunctionDeclaration,
  InterfaceDeclaration,
  SourceFile,
  VariableDeclaration,
} from 'ts-morph';

export interface RouterGeneratorMetadata {
  name: string;
  alias?: string;
  procedures: Array<ProcedureGeneratorMetadata>;
}

export interface ProcedureGeneratorMetadata {
  name: string;
  decorators: Array<DecoratorGeneratorMetadata>;
}

export interface DecoratorGeneratorMetadata {
  name: 'Query' | 'Mutation';
  arguments: {
    input?: string;
    output?: string;
  };
}

export interface SourceFileImportsMap {
  initializer:
    | Expression
    | ClassDeclaration
    | InterfaceDeclaration
    | EnumDeclaration
    | VariableDeclaration
    | FunctionDeclaration;
  sourceFile: SourceFile;
}
