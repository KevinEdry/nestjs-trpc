import { ConsoleLogger, Inject, Module } from '@nestjs/common';
import type { LoggerService } from '@nestjs/common';
import type {
  DynamicModule,
  MiddlewareConsumer,
  NestModule,
  OnModuleInit,
} from '@nestjs/common/interfaces';
import { HttpAdapterHost, MetadataScanner } from '@nestjs/core';

import {
  LOGGER_CONTEXT,
  TRPC_LOGGER,
  TRPC_MODULE_OPTIONS,
} from './trpc.constants';

import { TRPCModuleOptions } from './interfaces';
import { TRPCDriver } from './trpc.driver';
import { AppRouterHost } from './app-router.host';
import { ExpressDriver, FastifyDriver } from './drivers';
import { TRPCFactory } from './factories/trpc.factory';
import { RouterFactory } from './factories/router.factory';
import { ProcedureFactory } from './factories/procedure.factory';
import { MiddlewareFactory } from './factories/middleware.factory';
import { ScannerModule } from './scanners/scanner.module';

@Module({})
export class TRPCModule implements NestModule, OnModuleInit {
  @Inject(TRPC_MODULE_OPTIONS)
  private readonly options!: TRPCModuleOptions;

  @Inject(TRPC_LOGGER)
  private readonly logger!: LoggerService;

  @Inject(HttpAdapterHost)
  private readonly httpAdapterHost!: HttpAdapterHost;

  @Inject(TRPCDriver)
  private readonly trpcDriver!: TRPCDriver;

  @Inject(AppRouterHost)
  private readonly appRouterHost!: AppRouterHost;

  static forRoot(options: TRPCModuleOptions = {}): DynamicModule {
    return {
      module: TRPCModule,
      imports: [ScannerModule],
      providers: [
        { provide: TRPC_MODULE_OPTIONS, useValue: options },
        {
          provide: TRPC_LOGGER,
          useFactory: () => {
            if (options.logger != null) {
              return options.logger;
            }
            const logger = new ConsoleLogger();
            logger.setContext(LOGGER_CONTEXT);
            return logger;
          },
        },

        // NestJS Providers
        MetadataScanner,

        // Factories
        TRPCFactory,
        RouterFactory,
        ProcedureFactory,
        MiddlewareFactory,

        // Drivers
        TRPCDriver,
        FastifyDriver,
        ExpressDriver,

        // Exports
        AppRouterHost,
      ],
      exports: [AppRouterHost],
    };
  }

  // Register tRPC middleware during NestJS's middleware registration phase,
  // which runs before controller routes are compiled. This prevents wildcard
  // controllers (e.g. @All('*')) from intercepting tRPC requests.
  async configure(_consumer: MiddlewareConsumer) {
    const httpAdapter = this.httpAdapterHost?.httpAdapter;
    if (!httpAdapter) {
      return;
    }

    await this.trpcDriver.start(this.options);
  }

  async onModuleInit() {
    const httpAdapter = this.httpAdapterHost?.httpAdapter;
    if (!httpAdapter) {
      return;
    }

    const platformName = httpAdapter.getType();
    if (this.appRouterHost.appRouter != null) {
      this.logger.log(
        `Server has been initialized successfully using the ${platformName} driver.`,
        'TRPC Server',
      );
    }
  }
}
