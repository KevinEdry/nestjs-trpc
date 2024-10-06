import { ConsoleLogger, Inject, Module } from '@nestjs/common';
import { DynamicModule, OnModuleInit } from '@nestjs/common/interfaces';
import { HttpAdapterHost } from '@nestjs/core';

import {
  LOGGER_CONTEXT,
  TRPC_MODULE_CALLER_FILE_PATH,
  TRPC_MODULE_OPTIONS,
} from './trpc.constants';

import { TRPCModuleOptions } from './interfaces';
import { TRPCDriver } from './trpc.driver';
import { AppRouterHost } from './app-router.host';
import { ExpressDriver, FastifyDriver } from './drivers';
import { FileScanner } from './scanners/file.scanner';
import { GeneratorModule } from './generators/generator.module';
import { FactoryModule } from './factories/factory.module';
import { ScannerModule } from './scanners/scanner.module';

@Module({
  imports: [FactoryModule, ScannerModule],
  providers: [
    // NestJS Providers
    ConsoleLogger,

    // Drivers
    TRPCDriver,
    FastifyDriver,
    ExpressDriver,

    // Exports
    AppRouterHost,
  ],
  exports: [AppRouterHost],
})
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
    const fileScanner = new FileScanner();
    const callerFilePath = fileScanner.getCallerFilePath();
    return {
      module: TRPCModule,
      imports: [
        GeneratorModule.forRoot({
          outputDirPath: options.autoSchemaFile,
          rootModuleFilePath: callerFilePath,
        }),
      ],
      providers: [
        { provide: TRPC_MODULE_OPTIONS, useValue: options },
        {
          provide: TRPC_MODULE_CALLER_FILE_PATH,
          useValue: callerFilePath,
        },
      ],
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
