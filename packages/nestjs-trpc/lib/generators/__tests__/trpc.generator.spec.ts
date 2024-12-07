import { Test, TestingModule } from '@nestjs/testing';
import { TRPCGenerator } from '../trpc.generator';
import { ConsoleLogger } from '@nestjs/common';
import { RouterGenerator } from '../router.generator';
import { MiddlewareGenerator } from '../middleware.generator';
import { ContextGenerator } from '../context.generator';
import { RouterFactory } from '../../factories/router.factory';
import { MiddlewareFactory } from '../../factories/middleware.factory';
import { ProcedureFactory } from '../../factories/procedure.factory';
import { ClassDeclaration, Project, SourceFile } from 'ts-morph';
import * as fileUtil from '../../utils/ts-morph.util';
import { ProcedureFactoryMetadata } from '../../interfaces/factory.interface';
import { MiddlewareOptions, MiddlewareResponse, TRPCContext, TRPCMiddleware } from '../../interfaces';
import { CreateExpressContextOptions } from '@trpc/server/adapters/express';
import { TRPC_GENERATOR_OPTIONS, TRPC_MODULE_CALLER_FILE_PATH } from '../../trpc.constants';
import { TYPESCRIPT_APP_ROUTER_SOURCE_FILE, TYPESCRIPT_PROJECT } from '../generator.constants';
import { StaticGenerator } from '../static.generator';
import { ImportsScanner } from '../../scanners/imports.scanner';
import { SourceFileImportsMap } from '../../interfaces/generator.interface';

jest.mock('../../utils/ts-morph.util');

describe('TRPCGenerator', () => {
  let trpcGenerator: TRPCGenerator;
  let consoleLogger: jest.Mocked<ConsoleLogger>;
  let routerGenerator: jest.Mocked<RouterGenerator>;
  let middlewareGenerator: jest.Mocked<MiddlewareGenerator>;
  let contextGenerator: jest.Mocked<ContextGenerator>;
  let routerFactory: jest.Mocked<RouterFactory>;
  let middlewareFactory: jest.Mocked<MiddlewareFactory>;
  let procedureFactory: jest.Mocked<ProcedureFactory>;
  let importScanner: jest.Mocked<ImportsScanner>;
  let project: Project;
  let sourceFile: SourceFile;

  beforeEach(async () => {
    project = new Project();
    sourceFile = project.createSourceFile("test.ts", "", {overwrite: true});

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TRPCGenerator,
        {
          provide: ConsoleLogger,
          useValue: {
            log: jest.fn(),
            warn: jest.fn(),
          },
        },
        {
          provide: RouterGenerator,
          useValue: {
            serializeRouters: jest.fn(),
            generateRoutersStringFromMetadata: jest.fn(),
          },
        },
        {
          provide: MiddlewareGenerator,
          useValue: {
            getMiddlewareInterface: jest.fn(),
          },
        },
        {
          provide: ContextGenerator,
          useValue: {
            getContextInterface: jest.fn(),
          },
        },
        {
          provide: StaticGenerator,
          useValue: {
            generateStaticDeclaration: jest.fn(),
            addSchemaImports: jest.fn(),
          },
        },
        {
          provide: RouterFactory,
          useValue: {
            getRouters: jest.fn(),
          },
        },
        {
          provide: MiddlewareFactory,
          useValue: {
            getMiddlewares: jest.fn(),
          },
        },
        {
          provide: ProcedureFactory,
          useValue: {
            getProcedures: jest.fn(),
          },
        },
        {
          provide: ImportsScanner,
          useValue: {
            buildSourceFileImportsMap: jest.fn(),
            resolveBarrelFileImport: jest.fn(),
          },
        },

        { provide: TYPESCRIPT_PROJECT, useValue: project },
        {
          provide: TRPC_MODULE_CALLER_FILE_PATH,
          useValue: sourceFile.getFilePath(),
        },
        {
          provide: TYPESCRIPT_APP_ROUTER_SOURCE_FILE,
          useValue: sourceFile,
        },
      ],
    }).compile();

    trpcGenerator = module.get<TRPCGenerator>(TRPCGenerator);
    consoleLogger = module.get(ConsoleLogger);
    routerGenerator = module.get(RouterGenerator);
    middlewareGenerator = module.get(MiddlewareGenerator);
    contextGenerator = module.get(ContextGenerator);
    routerFactory = module.get(RouterFactory);
    middlewareFactory = module.get(MiddlewareFactory);
    procedureFactory = module.get(ProcedureFactory);
    importScanner = module.get(ImportsScanner);
  });

  it('should be defined', () => {
    expect(trpcGenerator).toBeDefined();
  });

  describe('generateSchemaFile', () => {
    it('should generate schema file', async () => {
      const mockRouters = [{ name: 'TestRouter', instance: {}, alias: 'test', path: 'testPath', middlewares: [] }];
      const mockProcedures: Array<ProcedureFactoryMetadata> = [{ 
        name: 'testProcedure', 
        implementation: jest.fn(), 
        type: "query", 
        input: undefined,
        output: undefined,
        params: [],
        middlewares: [],
      }];
      const mockRoutersMetadata = [{ name: 'TestRouter', alias: 'test', procedures: [{ name: 'testProcedure', decorators: [] }], path: 'testPath'}];

      routerFactory.getRouters.mockReturnValue(mockRouters);
      procedureFactory.getProcedures.mockReturnValue(mockProcedures);
      routerGenerator.serializeRouters.mockReturnValue(mockRoutersMetadata);
      routerGenerator.generateRoutersStringFromMetadata.mockReturnValue('test: t.router({})');

      jest.spyOn(project, 'createSourceFile').mockReturnValue(sourceFile);
      (fileUtil.saveOrOverrideFile as jest.Mock).mockResolvedValue(undefined);

      await trpcGenerator.generateSchemaFile([{name: '/output/path'}]);

      expect(routerFactory.getRouters).toHaveBeenCalled();
      expect(procedureFactory.getProcedures).toHaveBeenCalled();
      expect(routerGenerator.serializeRouters).toHaveBeenCalledWith(expect.any(Array), expect.any(Project));
      expect(routerGenerator.generateRoutersStringFromMetadata).toHaveBeenCalledWith(mockRoutersMetadata);
      expect(fileUtil.saveOrOverrideFile).toHaveBeenCalled();
      expect(consoleLogger.log).toHaveBeenCalledWith(
        'AppRouter has been updated successfully at "./test.ts".',
        'TRPC Generator'
      );
    });

    it('should handle errors', async () => {
      routerFactory.getRouters.mockImplementation(() => {
        throw new Error('Test error');
      });

      await trpcGenerator.generateSchemaFile([{name: '/output/path'}]);

      expect(consoleLogger.warn).toHaveBeenCalledWith('TRPC Generator encountered an error.', expect.any(Error));
    });
  });

  describe('generateHelpersFile', () => {
    it('should generate helpers file', async () => {
      class TestMiddleware implements TRPCMiddleware {
        use(opts: MiddlewareOptions<object>): MiddlewareResponse | Promise<MiddlewareResponse> {
          throw new Error('Method not implemented.');
        }
      }
      class TestContext implements TRPCContext {
        create(opts: CreateExpressContextOptions): Record<string, unknown> | Promise<Record<string, unknown>> {
          throw new Error('Method not implemented.');
        }
      }

      const mockMiddlewares = [{ instance: TestMiddleware, path: 'testPath' }];
      const mockMiddlewareInterface = { name: 'TestMiddleware', properties: [{ name: 'test', type: 'string' }] };
      const mockImportsMap = new Map<string, SourceFileImportsMap>([
        [TestContext.name, {sourceFile, initializer: sourceFile.getClass(TestContext.name) as ClassDeclaration}]
      ])

      middlewareFactory.getMiddlewares.mockReturnValue(mockMiddlewares);
      middlewareGenerator.getMiddlewareInterface.mockResolvedValue(mockMiddlewareInterface);
      contextGenerator.getContextInterface.mockResolvedValue('{ user: string }');
      // importScanner.buildSourceFileImportsMap.mockImplementation((arg) => { console.log('arg:', arg); return mockImportsMap; })
      importScanner.buildSourceFileImportsMap.mockReturnValue(mockImportsMap);

      // Call onModuleInit to set up the project
      trpcGenerator.onModuleInit();

      jest.spyOn(project, 'createSourceFile').mockReturnValue(sourceFile);
      (fileUtil.saveOrOverrideFile as jest.Mock).mockResolvedValue(undefined);

      await trpcGenerator.generateHelpersFile(TestContext);

      expect(importScanner.buildSourceFileImportsMap).toHaveBeenCalled();
      expect(middlewareFactory.getMiddlewares).toHaveBeenCalled();
      expect(contextGenerator.getContextInterface).toHaveBeenCalled();
      expect(middlewareGenerator.getMiddlewareInterface).toHaveBeenCalled();
      expect(fileUtil.saveOrOverrideFile).toHaveBeenCalled();
      expect(consoleLogger.log).toHaveBeenCalledWith(
        'Helper types has been updated successfully at "nestjs-trpc/types".',
        'TRPC Generator'
      );
    });

    it('should handle errors', async () => {
      middlewareFactory.getMiddlewares.mockImplementation(() => {
        throw new Error('Test error');
      });

      await trpcGenerator.generateHelpersFile();

      expect(consoleLogger.warn).toHaveBeenCalledWith('TRPC Generator encountered an error.', expect.any(Error));
    });
  });
});