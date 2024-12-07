import { Test, TestingModule } from '@nestjs/testing';
import { RouterGenerator } from '../router.generator';
import { DecoratorGenerator } from '../decorator.generator';
import { Project, SourceFile } from 'ts-morph';
import { RoutersFactoryMetadata, } from '../../interfaces/factory.interface';
import {
  DecoratorGeneratorMetadata,
  ProcedureGeneratorMetadata,
  RouterGeneratorMetadata,
} from '../../interfaces/generator.interface';
import { Query, Mutation } from '../../decorators';
import { z } from 'zod';
import { ProcedureGenerator } from '../procedure.generator';

describe('RouterGenerator', () => {
  let routerGenerator: RouterGenerator;
  let decoratorGenerator: jest.Mocked<DecoratorGenerator>;
  let procedureGenerator: jest.Mocked<ProcedureGenerator>;
  let project: Project;
  let sourceFile: SourceFile;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RouterGenerator,
        {
          provide: DecoratorGenerator,
          useValue: {
            serializeProcedureDecorators: jest.fn(),
          },
        },
        {
          provide: ProcedureGenerator,
          useValue: {
            generateProcedureString: jest.fn(),
          },
        },
      ],
    }).compile();

    routerGenerator = module.get<RouterGenerator>(RouterGenerator);
    decoratorGenerator = module.get(DecoratorGenerator);
    procedureGenerator = module.get(ProcedureGenerator);
    project = new Project();
    
    sourceFile = project.createSourceFile(
      "test.ts",
      `
      import { Query, Mutation } from '../../decorators';
      import { z } from 'zod';

      export class TestRouter {
        @Query()
        testQuery() {
          return 'test query';
        }

        @Mutation()
        testMutation() {
          return 'test mutation';
        }
      }
      `, { overwrite: true }
    );
  });

  it('should be defined', () => {
    expect(routerGenerator).toBeDefined();
  });

  describe('serializeRouters', () => {
    it('should serialize routers', async () => {
      class TestRouter {
        @Query()
        testQuery() {
          return 'test query';
        }

        @Mutation()
        testMutation() {
          return 'test mutation';
        }
      }

      const mockRouter: RoutersFactoryMetadata = {
        name: 'TestRouter',
        alias: 'test',
        path: 'testPath',
        instance: {
            name: "TestRouter",
            instance: jest.fn(),
            alias: 'test',
            path:"testPath",
            middlewares: []
        },
        procedures: [
          {
            name: 'testQuery',
            implementation: TestRouter.prototype.testQuery,
            type: 'query',
            input: z.string(),
            output: z.string(),
            params: [],
            middlewares: [],
          },
          {
            name: 'testMutation',
            implementation: TestRouter.prototype.testMutation,
            type: 'mutation',
            input: z.string(),
            output: z.string(),
            params: [],
            middlewares: [],
          },
        ]
      };

      const mockTestQueryDecoratorMetadata: DecoratorGeneratorMetadata[] = [
          { name: 'Query', arguments: {} }
      ];
      const mockTestMutationDecoratorMetadata: DecoratorGeneratorMetadata[] = [
          { name: 'Mutation', arguments: {} },
      ];

      decoratorGenerator.serializeProcedureDecorators.mockReturnValueOnce(mockTestQueryDecoratorMetadata).mockReturnValue(mockTestMutationDecoratorMetadata);
      
      jest.spyOn(project, 'addSourceFileAtPath').mockReturnValue(sourceFile);

      const result = await routerGenerator.serializeRouters([mockRouter], project)

      expect(result).toEqual<Array<RouterGeneratorMetadata>>([
        {
          name: 'TestRouter',
          alias: 'test',
          procedures: [
            {
              name: 'testQuery',
              decorators: [{ name: 'Query', arguments: {} }],
            },
            {
              name: 'testMutation',
              decorators: [{ name: 'Mutation', arguments: {} }],
            },
          ],
        },
      ]);
    });
  });

  describe('generateRoutersStringFromMetadata', () => {
    it('should generate router string from metadata', () => {
        const mockRouterMetadata: Array<RouterGeneratorMetadata> = [
        {
          name: 'TestRouter',
          alias: 'test',
          procedures: [
            {
              name: 'testQuery',
              decorators: [{ name: 'Query', arguments: {} }],
            },
            {
              name: 'testMutation',
              decorators: [{ name: 'Mutation', arguments: {} }],
            },
          ],
        },
      ];

      procedureGenerator.generateProcedureString.mockReturnValueOnce('testQuery: publicProcedure.query(async () => "PLACEHOLDER_DO_NOT_REMOVE" as any )');
      procedureGenerator.generateProcedureString.mockReturnValueOnce('testMutation: publicProcedure.mutation(async () => "PLACEHOLDER_DO_NOT_REMOVE" as any )');

      const result = routerGenerator.generateRoutersStringFromMetadata(mockRouterMetadata);

      expect(result).toBe(
        'test: t.router({ ' +
        'testQuery: publicProcedure.query(async () => "PLACEHOLDER_DO_NOT_REMOVE" as any ),\n' +
        'testMutation: publicProcedure.mutation(async () => "PLACEHOLDER_DO_NOT_REMOVE" as any ) ' +
        '})'
      );
    });
  });
});