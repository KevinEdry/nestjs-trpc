import { Test, TestingModule } from '@nestjs/testing';
import { TRPCFactory } from '../trpc.factory';
import { TRPCGenerator } from '../../generators/trpc.generator';
import { RouterFactory } from '../router.factory';
import { ProcedureFactory } from '../procedure.factory';

describe('TRPCFactory', () => {
  let trpcFactory: TRPCFactory;
  let routerFactory: RouterFactory;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TRPCFactory,
        {
          provide: TRPCGenerator,
          useValue: {},
        },
        {
          provide: RouterFactory,
          useValue: {
            serializeRoutes: jest.fn(),
          },
        },
        {
          provide: ProcedureFactory,
          useValue: {},
        },
      ],
    }).compile();

    trpcFactory = module.get<TRPCFactory>(TRPCFactory);
    routerFactory = module.get<RouterFactory>(RouterFactory);
  });

  it('should be defined', () => {
    expect(trpcFactory).toBeDefined();
  });

  describe('serializeAppRoutes', () => {
    it('should serialize app routes', () => {
      const mockRouter = jest.fn();
      const mockProcedure = {} as any;
      const mockRouterSchema = { test: {} };

      (routerFactory.serializeRoutes as jest.Mock).mockReturnValue(mockRouterSchema);
      mockRouter.mockReturnValue({ test: {} });

      const result = trpcFactory.serializeAppRoutes(mockRouter, mockProcedure);

      expect(routerFactory.serializeRoutes).toHaveBeenCalledWith(mockProcedure);
      expect(mockRouter).toHaveBeenCalledWith(mockRouterSchema);
      expect(result).toEqual({ test: {} });
    });
  });
});