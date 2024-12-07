import { Test, TestingModule } from '@nestjs/testing';
import { MiddlewareGenerator } from '../middleware.generator';
import { Project, SourceFile } from 'ts-morph';
import { TRPCMiddleware } from '../../interfaces';

describe('MiddlewareGenerator', () => {
  let middlewareGenerator: MiddlewareGenerator;
  let project: Project;
  let sourceFile: SourceFile;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MiddlewareGenerator],
    }).compile();

    middlewareGenerator = module.get<MiddlewareGenerator>(MiddlewareGenerator);
    project = new Project();
    
    sourceFile = project.createSourceFile(
      "test.ts",
      `
      import { TRPCMiddleware } from './interfaces';

      export class TestMiddleware implements TRPCMiddleware {
        use(opts: any) {
          return opts.next({
            ctx: {
              user: { id: '1', name: 'Test' },
            },
          });
        }
      }
      `,
      { overwrite: true }
    );
  });

  it('should be defined', () => {
    expect(middlewareGenerator).toBeDefined();
  });

  describe('getMiddlewareInterface', () => {
    it('should return null if middleware class name is not defined', async () => {
      const result = await middlewareGenerator.getMiddlewareInterface('routerPath', {} as any, project);
      expect(result).toBeNull();
    });

    it('should return the middleware interface if everything is valid', async () => {
      class TestMiddleware implements TRPCMiddleware {
        use(opts: any) {
          return opts.next({
            ctx: {
              user: { id: '1', name: 'Test' },
            },
          });
        }
      }

      jest.spyOn(project, 'addSourceFileAtPath').mockReturnValue(sourceFile);

      const result = await middlewareGenerator.getMiddlewareInterface('routerPath', TestMiddleware, project);
      expect(result).toEqual({
        name: 'TestMiddleware',
        properties: [
          { name: 'user', type: '{ id: string; name: string; }' },
        ],
      });
    });
  });
});