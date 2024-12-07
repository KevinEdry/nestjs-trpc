import { Test, TestingModule } from '@nestjs/testing';
import { Project } from 'ts-morph';
import {
  ProcedureGeneratorMetadata,
} from '../../interfaces/generator.interface';
import { ProcedureGenerator } from '../procedure.generator';
import { ImportsScanner } from '../../scanners/imports.scanner';
import { StaticGenerator } from '../static.generator';
import { TYPESCRIPT_APP_ROUTER_SOURCE_FILE } from '../generator.constants';

describe('ProcedureGenerator', () => {
  let procedureGenerator: ProcedureGenerator;
  let project: Project;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProcedureGenerator,
        {
          provide: ImportsScanner,
          useValue: jest.fn(),
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
});