import { Test, TestingModule } from '@nestjs/testing';
import { DecoratorGenerator } from '../decorator.generator';
import { ConsoleLogger } from '@nestjs/common';
import { Project, SourceFile } from 'ts-morph';
import { ProcedureGenerator } from '../procedure.generator';

describe('DecoratorGenerator', () => {
  let decoratorGenerator: DecoratorGenerator;
  let consoleLogger: jest.Mocked<ConsoleLogger>;
  let project: Project;
  let sourceFile: SourceFile;

  beforeEach(async () => {
    project = new Project();
    sourceFile = project.createSourceFile("test.ts", `
      import { Query, Mutation, UseMiddlewares } from '@nestjs/common';
      
      class TestClass {
        @Query()
        queryMethod() {}

        @Mutation()
        mutationMethod() {}

        @UseMiddlewares()
        middlewareMethod() {}

        @UnsupportedDecorator()
        unsupportedMethod() {}
      }
    `, {overwrite: true});

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DecoratorGenerator,
        {
          provide: ConsoleLogger,
          useValue: {
            warn: jest.fn(),
          },
        },
        {
          provide: ProcedureGenerator,
          useValue: {
            warn: jest.fn(),
          },
        },
      ],
    }).compile();

    decoratorGenerator = module.get<DecoratorGenerator>(DecoratorGenerator);
    consoleLogger = module.get(ConsoleLogger);
  });

  it('should be defined', () => {
    expect(decoratorGenerator).toBeDefined();
  });

  describe('serializeProcedureDecorators', () => {
    it('should serialize Query decorator', () => {
      const queryMethod = sourceFile.getClass('TestClass')!.getMethod('queryMethod')!;
      const queryDecorator = queryMethod.getDecorator('Query')!;

      const result = decoratorGenerator.serializeProcedureDecorators(
        [queryDecorator],
        sourceFile,
        project
      );

      expect(result).toEqual([{ name: 'Query', arguments: {} }]);
    });

    it('should serialize Mutation decorator', () => {
      const mutationMethod = sourceFile.getClass('TestClass')!.getMethod('mutationMethod')!;
      const mutationDecorator = mutationMethod.getDecorator('Mutation')!;

      const result = decoratorGenerator.serializeProcedureDecorators(
        [mutationDecorator],
        sourceFile,
        project
      );

      expect(result).toEqual([{ name: 'Mutation', arguments: {} }]);
    });

    it('should ignore UseMiddlewares decorator', () => {
      const middlewareMethod = sourceFile.getClass('TestClass')!.getMethod('middlewareMethod')!;
      const middlewaresDecorator = middlewareMethod.getDecorator('UseMiddlewares')!;

      const result = decoratorGenerator.serializeProcedureDecorators(
        [middlewaresDecorator],
        sourceFile,
        project
      );

      expect(result).toEqual([]);
    });

    it('should warn about unsupported decorators', () => {
      const unsupportedMethod = sourceFile.getClass('TestClass')!.getMethod('unsupportedMethod')!;
      const unsupportedDecorator = unsupportedMethod.getDecorator('UnsupportedDecorator')!;

      decoratorGenerator.serializeProcedureDecorators(
        [unsupportedDecorator],
        sourceFile,
        project
      );

      expect(consoleLogger.warn).toHaveBeenCalledWith('Decorator UnsupportedDecorator, not supported.');
    });
  });
});