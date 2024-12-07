import { Test, TestingModule } from '@nestjs/testing';
import { MiddlewareFactory } from '../middleware.factory';
import { RouterFactory } from '../router.factory';
import { ProcedureFactory } from '../procedure.factory';

describe('MiddlewareFactory', () => {
  let middlewareFactory: MiddlewareFactory;
  let routerFactory: RouterFactory;
  let procedureFactory: ProcedureFactory;

  beforeEach(async () => {
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
      ],
    }).compile();

    middlewareFactory = module.get<MiddlewareFactory>(MiddlewareFactory);
    routerFactory = module.get<RouterFactory>(RouterFactory);
    procedureFactory = module.get<ProcedureFactory>(ProcedureFactory);
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
      expect(result[0]).toStrictEqual({"instance": mockProcedure.middlewares[0], "path": undefined });
    });

    it('should handle procedures without middlewares', () => {
      const mockRouter = { instance: {}, prototype: {}, middlewares: []  };
      const mockProcedure = { middlewares: undefined };
      
      (routerFactory.getRouters as jest.Mock).mockReturnValue([mockRouter]);
      (procedureFactory.getProcedures as jest.Mock).mockReturnValue([mockProcedure]);

      const result = middlewareFactory.getMiddlewares();

      expect(result).toHaveLength(0);
    });
  });
});