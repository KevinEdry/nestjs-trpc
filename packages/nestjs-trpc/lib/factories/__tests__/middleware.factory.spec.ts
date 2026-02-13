import { Test, TestingModule } from '@nestjs/testing';
import { MiddlewareFactory } from '../middleware.factory';
import { RouterFactory } from '../router.factory';
import { ProcedureFactory } from '../procedure.factory';
import { TRPC_MODULE_OPTIONS } from '../../trpc.constants';

describe('MiddlewareFactory', () => {
  let middlewareFactory: MiddlewareFactory;
  let routerFactory: RouterFactory;
  let procedureFactory: ProcedureFactory;

  const createModule = async (moduleOptions = {}) => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MiddlewareFactory,
        {
          provide: RouterFactory,
          useValue: {
            getRouters: jest.fn(),
          },
        },
        {
          provide: ProcedureFactory,
          useValue: {
            getProcedures: jest.fn(),
          },
        },
        {
          provide: TRPC_MODULE_OPTIONS,
          useValue: moduleOptions,
        },
      ],
    }).compile();

    middlewareFactory = module.get<MiddlewareFactory>(MiddlewareFactory);
    routerFactory = module.get<RouterFactory>(RouterFactory);
    procedureFactory = module.get<ProcedureFactory>(ProcedureFactory);

    return module;
  };

  beforeEach(async () => {
    await createModule();
  });

  it('should be defined', () => {
    expect(middlewareFactory).toBeDefined();
  });

  describe('getMiddlewares', () => {
    it('should return unique middlewares', () => {
      const mockRouter = { instance: {}, prototype: {}, middlewares: [] };
      const mockProcedure = { middlewares: [class TestMiddleware {}] };

      (routerFactory.getRouters as jest.Mock).mockReturnValue([mockRouter]);
      (procedureFactory.getProcedures as jest.Mock).mockReturnValue([mockProcedure]);

      const result = middlewareFactory.getMiddlewares();

      expect(result).toHaveLength(1);
      expect(result[0]).toStrictEqual({"instance": mockProcedure.middlewares[0]});
    });

    it('should handle procedures without middlewares', () => {
      const mockRouter = { instance: {}, prototype: {}, middlewares: []  };
      const mockProcedure = { middlewares: undefined };

      (routerFactory.getRouters as jest.Mock).mockReturnValue([mockRouter]);
      (procedureFactory.getProcedures as jest.Mock).mockReturnValue([mockProcedure]);

      const result = middlewareFactory.getMiddlewares();

      expect(result).toHaveLength(0);
    });

    it('should include global middlewares with empty path', async () => {
      class GlobalLogMiddleware {
        use = jest.fn();
      }

      await createModule({ globalMiddlewares: [GlobalLogMiddleware] });

      (routerFactory.getRouters as jest.Mock).mockReturnValue([]);

      const result = middlewareFactory.getMiddlewares();

      expect(result).toHaveLength(1);
      expect(result[0]).toStrictEqual({
        instance: GlobalLogMiddleware,
      });
    });

    it('should prepend global middlewares before router middlewares', async () => {
      class GlobalMiddleware {
        use = jest.fn();
      }

      await createModule({ globalMiddlewares: [GlobalMiddleware] });

      const mockRouter = { instance: {}, prototype: {}, middlewares: [] };
      const RouterMiddleware = class RouterMw {};
      const mockProcedure = { middlewares: [RouterMiddleware] };

      (routerFactory.getRouters as jest.Mock).mockReturnValue([mockRouter]);
      (procedureFactory.getProcedures as jest.Mock).mockReturnValue([mockProcedure]);

      const result = middlewareFactory.getMiddlewares();

      expect(result).toHaveLength(2);
      expect(result[0].instance).toBe(GlobalMiddleware);
      expect(result[1].instance).toBe(RouterMiddleware);
    });

    it('should work when globalMiddlewares is not provided', async () => {
      await createModule({});

      (routerFactory.getRouters as jest.Mock).mockReturnValue([]);

      const result = middlewareFactory.getMiddlewares();

      expect(result).toHaveLength(0);
    });
  });
});