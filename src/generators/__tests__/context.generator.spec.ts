import { Test, TestingModule } from '@nestjs/testing';
import { ContextGenerator } from '../context.generator';
import { Project, SourceFile } from 'ts-morph';
import { TRPCContext } from '../../interfaces';

jest.mock('func-loc', () => ({
  locate: jest.fn().mockResolvedValue({ path: 'test.ts' }),
}));

describe('ContextGenerator', () => {
  let contextGenerator: ContextGenerator;
  let project: Project;
  let sourceFile: SourceFile;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ContextGenerator],
    }).compile();

    contextGenerator = module.get<ContextGenerator>(ContextGenerator);
    project = new Project();
    
    sourceFile = project.createSourceFile(
      "test.ts",
      `
      import { TRPCContext } from './interfaces';

      export class TestContext implements TRPCContext {
        create() {
          return { user: { id: '1', name: 'Test' } };
        }
      }
      `, { overwrite: true }
    );
  });

  it('should be defined', () => {
    expect(contextGenerator).toBeDefined();
  });

  describe('getContextInterface', () => {
    it('should return null if context class name is not defined', async () => {
      const result = await contextGenerator.getContextInterface({} as any, project);
      expect(result).toBeNull();
    });

    it('should return the context interface if everything is valid', async () => {
      class TestContext implements TRPCContext {
        create() {
          return { user: { id: '1', name: 'Test' } };
        }
      }

      jest.spyOn(project, 'addSourceFileAtPath').mockReturnValue(sourceFile);

      const result = await contextGenerator.getContextInterface(TestContext, project);
      expect(result).toBe('{ user: { id: string; name: string; }; }');
    });

    it('should return null if create method is not found', async () => {
      sourceFile = project.createSourceFile(
        "test.ts",
        `
        export class InvalidContext {
          // No create method
        }
        `, { overwrite: true }
      );

      class InvalidContext {}

      jest.spyOn(project, 'addSourceFileAtPath').mockReturnValue(sourceFile);

      //@ts-expect-error
      const result = await contextGenerator.getContextInterface(InvalidContext, project);
      expect(result).toBeNull();
    });
  });
});