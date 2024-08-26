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
});