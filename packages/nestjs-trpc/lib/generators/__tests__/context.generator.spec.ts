import { Test, TestingModule } from '@nestjs/testing';
import { ContextGenerator } from '../context.generator';
import { Project, SourceFile } from 'ts-morph';
import { TRPCContext } from '../../interfaces';

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

    it('should return the context interface if everything is valid', async () => {
      class TestContext implements TRPCContext {
        create() {
          return { user: { id: '1', name: 'Test' } };
        }
      }

      jest.spyOn(project, 'addSourceFileAtPath').mockReturnValue(sourceFile);

      const result = await contextGenerator.getContextInterface(sourceFile, TestContext);
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

      //@ts-expect-error invalid context passed in
      const result = await contextGenerator.getContextInterface(sourceFile, InvalidContext);
      expect(result).toBeNull();
    });
  });
});