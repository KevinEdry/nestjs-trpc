import { ConsoleLogger, Inject, Module } from '@nestjs/common';
import { DynamicModule, OnModuleInit } from '@nestjs/common/interfaces';
import { HttpAdapterHost, MetadataScanner } from '@nestjs/core';
import { TRPCModuleOptions } from './interfaces';
import { LOGGER_CONTEXT, TRPC_MODULE_OPTIONS } from './trpc.constants';
import { TRPCDriver } from './trpc.driver';
import { TRPCFactory } from './trpc.factory';
import { TRPCGenerator } from './trpc.generator';

@Module({
  imports: [],
  providers: [
    TRPCDriver,
    TRPCFactory,
    MetadataScanner,
    TRPCGenerator,
    ConsoleLogger,
  ],
  exports: [],
})
export class TRPCModule implements OnModuleInit {
  constructor(
    @Inject(TRPC_MODULE_OPTIONS) private readonly options: TRPCModuleOptions,
    @Inject(ConsoleLogger) private readonly consoleLogger: ConsoleLogger,
    private readonly httpAdapterHost: HttpAdapterHost,
    private readonly trpcDriver: TRPCDriver,
  ) {}

  static forRoot<TOptions extends Record<string, any> = TRPCModuleOptions>(
    options: TOptions = {} as TOptions,
  ): DynamicModule {
    return {
      module: TRPCModule,
      providers: [{ provide: TRPC_MODULE_OPTIONS, useValue: options }],
    };
  }

  onModuleInit() {
    const httpAdapter = this.httpAdapterHost?.httpAdapter;
    if (!httpAdapter) {
      return;
    }

    this.trpcDriver.start(this.options);
    this.consoleLogger.setContext(LOGGER_CONTEXT);
    this.consoleLogger.log('TRPC server has been initialized successfully.');
  }
}
