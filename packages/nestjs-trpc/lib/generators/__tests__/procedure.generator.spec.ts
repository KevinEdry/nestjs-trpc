import { Test, TestingModule } from '@nestjs/testing';
import { Identifier, Project, SourceFile, SyntaxKind } from 'ts-morph';
import {
  ProcedureGeneratorMetadata,
} from '../../interfaces/generator.interface';
import { ProcedureGenerator } from '../procedure.generator';
import { ImportsScanner } from '../../scanners/imports.scanner';
import { StaticGenerator } from '../static.generator';
import { TYPESCRIPT_APP_ROUTER_SOURCE_FILE } from '../generator.constants';

describe('ProcedureGenerator', () => {
  let procedureGenerator: ProcedureGenerator;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProcedureGenerator,
        {
          provide: ImportsScanner,
          useValue: new ImportsScanner(), 
        },
        {
          provide: StaticGenerator,
          useValue: jest.fn(),
        },
        {
          provide: TYPESCRIPT_APP_ROUTER_SOURCE_FILE,
          useValue: jest.fn(),
        },
      ],
    }).compile();

    procedureGenerator = module.get<ProcedureGenerator>(ProcedureGenerator);
  });

  it('should be defined', () => {
    expect(procedureGenerator).toBeDefined();
  });

  describe('generateRoutersStringFromMetadata', () => {
    describe('for a query', () => {
      it('should generate router string from metadata', () => {
        const mockProcedure: ProcedureGeneratorMetadata = {
          name: 'testQuery',
          decorators: [{ name: 'Query', arguments: {} }],
        }

        const result = procedureGenerator.generateProcedureString(mockProcedure);

        expect(result).toBe(
          'testQuery: publicProcedure.query(async () => "PLACEHOLDER_DO_NOT_REMOVE" as any )'
        );
      });
    })

    describe('for a mutation', () => {
      it('should generate router string from metadata', () => {
        const mockProcedure: ProcedureGeneratorMetadata = {
          name: 'testMutation',
          decorators: [{ name: 'Mutation', arguments: {} }],
        }

        const result = procedureGenerator.generateProcedureString(mockProcedure);

        expect(result).toBe(
          'testMutation: publicProcedure.mutation(async () => "PLACEHOLDER_DO_NOT_REMOVE" as any )'
        );
      });
    })
  });

  describe('flattenZodSchema', () => {
    let project: Project;

    beforeEach(async () => {
      project = new Project();
    });
    
    it('should flatten all chained call expressions', () => {
      const sourceFile: SourceFile = project.createSourceFile(
        "test.ts",
        `
        import { z } from 'zod';

        const TypeEnum = z
          .enum(['Normal', 'Unknown'])
          .describe('Type of the item');

        const FindManyInput = z.object({
          options: z
            .object({
              userId: z.string().describe('ID of the current user'),
              type1: TypeEnum.optional().describe('Type 1 of the item')
            })
            .merge({
              z.object({
                type2: TypeEnum.optional().describe('Type 2 of the item')
              })
            })
            .describe('Options to find many items'),
        });
        `,
        { overwrite: true }
      );

      const node = sourceFile.getDescendantsOfKind(SyntaxKind.Identifier).find((identifier) => identifier.getText() === "FindManyInput") as Identifier;
      const result = procedureGenerator.flattenZodSchema(node, sourceFile, project, node.getText());
      expect(result).toMatchSnapshot();
    });
  });
});