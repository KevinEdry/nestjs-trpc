import { Test, TestingModule } from '@nestjs/testing';
import { ConsoleLogger } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { TRPCModule } from '../trpc.module';
import { TRPCDriver } from '../trpc.driver';
import { AppRouterHost } from '../app-router.host';
import { TRPC_MODULE_OPTIONS } from '../trpc.constants';

describe('TRPCModule', () => {
  let trpcModule: TRPCModule;
  let trpcDriver: TRPCDriver;

  const mockHttpAdapter = {
    getType: jest.fn().mockReturnValue('express'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TRPCModule,
        {
          provide: TRPC_MODULE_OPTIONS,
          useValue: { basePath: '/trpc' },
        },
        {
          provide: ConsoleLogger,
          useValue: { setContext: jest.fn(), log: jest.fn() },
        },
        {
          provide: HttpAdapterHost,
          useValue: { httpAdapter: mockHttpAdapter },
        },
        {
          provide: TRPCDriver,
          useValue: { start: jest.fn().mockResolvedValue(undefined) },
        },
        {
          provide: AppRouterHost,
          useValue: { appRouter: {} },
        },
      ],
    }).compile();

    trpcModule = module.get<TRPCModule>(TRPCModule);
    trpcDriver = module.get<TRPCDriver>(TRPCDriver);
  });

  describe('wildcard route conflict fix', () => {
    it('should initialize tRPC driver during configure() to register middleware before controller routes', async () => {
      const mockConsumer = {} as any;

      await trpcModule.configure(mockConsumer);

      expect(trpcDriver.start).toHaveBeenCalledWith({ basePath: '/trpc' });
    });

    it('should NOT call trpcDriver.start() during onModuleInit()', async () => {
      await trpcModule.onModuleInit();

      expect(trpcDriver.start).not.toHaveBeenCalled();
    });

    it('should register middleware before controller routes by using configure() lifecycle', async () => {
      const callOrder: string[] = [];

      (trpcDriver.start as jest.Mock).mockImplementation(async () => {
        callOrder.push('configure:trpcDriver.start');
      });

      // NestJS calls configure() during registerRouter(), before compiling controller routes.
      // Then callInitHook() fires onModuleInit() after routes are compiled.
      // Simulating the NestJS lifecycle order:
      await trpcModule.configure({} as any);
      callOrder.push('registerRouter:controllerRoutes');
      await trpcModule.onModuleInit();

      expect(callOrder).toEqual([
        'configure:trpcDriver.start',
        'registerRouter:controllerRoutes',
      ]);
      expect(trpcDriver.start).toHaveBeenCalledTimes(1);
    });
  });
});
