export interface RouterGeneratorMetadata {
  name: string;
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
