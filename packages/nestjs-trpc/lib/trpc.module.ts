import { ConsoleLogger, Inject, Module } from '@nestjs/common';
import { DynamicModule, OnModuleInit } from '@nestjs/common/interfaces';
import { HttpAdapterHost, MetadataScanner } from '@nestjs/core';

import { LOGGER_CONTEXT, TRPC_MODULE_OPTIONS } from './trpc.constants';

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
export class TRPCModule implements OnModuleInit {
  @Inject(TRPC_MODULE_OPTIONS)
  private readonly options!: TRPCModuleOptions;

  @Inject(ConsoleLogger)
  private readonly consoleLogger!: ConsoleLogger;

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

        // NestJS Providers
        ConsoleLogger,
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

  async onModuleInit() {
    const httpAdapter = this.httpAdapterHost?.httpAdapter;
    if (!httpAdapter) {
      return;
    }

    this.consoleLogger.setContext(LOGGER_CONTEXT);

    await this.trpcDriver.start(this.options);

    const platformName = httpAdapter.getType();
    if (this.appRouterHost.appRouter != null) {
      this.consoleLogger.log(
        `Server has been initialized successfully using the ${platformName} driver.`,
        'TRPC Server',
      );
    }
  }
}
