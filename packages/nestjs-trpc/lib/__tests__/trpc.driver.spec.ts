import { Test, TestingModule } from '@nestjs/testing';
import { HttpAdapterHost, ModuleRef } from '@nestjs/core';
import { TRPCDriver } from '../trpc.driver';
import { TRPCFactory } from '../factories/trpc.factory';
import { AppRouterHost } from '../app-router.host';
import { ExpressDriver, FastifyDriver } from '../drivers';
import { TRPC_LOGGER } from '../trpc.constants';
import { TRPCModuleOptions } from '../interfaces';

// Express app check requires typeof === 'function'
function createMockExpressApp() {
  const app: any = function () {};
  app.get = jest.fn();
  app.post = jest.fn();
  app.use = jest.fn();
  app.listen = jest.fn();
  return app;
}

describe('TRPCDriver', () => {
  let trpcDriver: TRPCDriver;
  let moduleRef: ModuleRef;

  const mockExpressApp = createMockExpressApp();

  const mockHttpAdapterHost = {
    httpAdapter: {
      getType: jest.fn().mockReturnValue('express'),
      getInstance: jest.fn().mockReturnValue(mockExpressApp),
    },
  };

  const mockTrpcFactory = {
    serializeAppRoutes: jest.fn().mockReturnValue({}),
  };

  const mockExpressDriver = {
    start: jest.fn().mockResolvedValue(undefined),
  };

  const mockFastifyDriver = {
    start: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TRPCDriver,
        {
          provide: HttpAdapterHost,
          useValue: mockHttpAdapterHost,
        },
        {
          provide: TRPCFactory,
          useValue: mockTrpcFactory,
        },
        {
          provide: TRPC_LOGGER,
          useValue: { log: jest.fn() },
        },
        {
          provide: AppRouterHost,
          useValue: { appRouter: null },
        },
        {
          provide: ExpressDriver,
          useValue: mockExpressDriver,
        },
        {
          provide: FastifyDriver,
          useValue: mockFastifyDriver,
        },
      ],
    }).compile();

    trpcDriver = module.get<TRPCDriver>(TRPCDriver);
    moduleRef = module.get<ModuleRef>(ModuleRef);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('global middlewares', () => {
    it('should chain global middlewares onto the base procedure', async () => {
      const useMock = jest.fn();
      class TestGlobalMiddleware {
        use = useMock;
      }

      const middlewareInstance = new TestGlobalMiddleware();
      jest.spyOn(moduleRef, 'get').mockReturnValue(middlewareInstance);

      const options: TRPCModuleOptions = {
        globalMiddlewares: [TestGlobalMiddleware],
      };

      await trpcDriver.start(options);

      expect(moduleRef.get).toHaveBeenCalledWith(TestGlobalMiddleware, {
        strict: false,
      });
      expect(mockTrpcFactory.serializeAppRoutes).toHaveBeenCalled();
    });

    it('should not alter the procedure when globalMiddlewares is empty', async () => {
      const options: TRPCModuleOptions = {
        globalMiddlewares: [],
      };

      await trpcDriver.start(options);

      expect(mockTrpcFactory.serializeAppRoutes).toHaveBeenCalled();
    });

    it('should not alter the procedure when globalMiddlewares is undefined', async () => {
      const options: TRPCModuleOptions = {};

      await trpcDriver.start(options);

      expect(mockTrpcFactory.serializeAppRoutes).toHaveBeenCalled();
    });

    it('should resolve each middleware instance from moduleRef', async () => {
      class MiddlewareA {
        use = jest.fn();
      }
      class MiddlewareB {
        use = jest.fn();
      }

      const instanceA = new MiddlewareA();
      const instanceB = new MiddlewareB();

      jest
        .spyOn(moduleRef, 'get')
        .mockImplementation((token: any, _opts?: any) => {
          if (token === MiddlewareA) return instanceA;
          if (token === MiddlewareB) return instanceB;
          return undefined;
        });

      const options: TRPCModuleOptions = {
        globalMiddlewares: [MiddlewareA, MiddlewareB],
      };

      await trpcDriver.start(options);

      expect(moduleRef.get).toHaveBeenCalledWith(MiddlewareA, {
        strict: false,
      });
      expect(moduleRef.get).toHaveBeenCalledWith(MiddlewareB, {
        strict: false,
      });
    });
  });
});
