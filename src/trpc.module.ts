import { ConsoleLogger, Inject, Module } from '@nestjs/common';
import { DynamicModule, OnModuleInit } from '@nestjs/common/interfaces';
import { HttpAdapterHost, MetadataScanner } from '@nestjs/core';
import { TRPCModuleOptions } from './interfaces';
import { LOGGER_CONTEXT, TRPC_MODULE_OPTIONS } from './trpc.constants';
import { TRPCDriver } from './trpc.driver';
import { TRPCFactory } from './factories/trpc.factory';
import { TRPCGenerator } from './generators/trpc.generator';
import { RouterFactory } from './factories/router.factory';
import { ProcedureFactory } from './factories/procedure.factory';
import { DecoratorGenerator } from './generators/decorator.generator';
import { RouterGenerator } from './generators/router.generator';
import { MiddlewareGenerator } from './generators/middleware.generator';
import { ContextGenerator } from './generators/context.generator';
import { MiddlewareFactory } from './factories/middleware.factory';

@Module({
  imports: [],
  providers: [
    ConsoleLogger,
    TRPCDriver,
    TRPCFactory,
    MetadataScanner,
    RouterFactory,
    ProcedureFactory,
    MiddlewareFactory,
    DecoratorGenerator,
    MiddlewareGenerator,
    ContextGenerator,
    RouterGenerator,
    TRPCGenerator,
  ],
  exports: [],
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

  static forRoot<TOptions extends Record<string, any> = TRPCModuleOptions>(
    options: TOptions = {} as TOptions,
  ): DynamicModule {
    return {
      module: TRPCModule,
      providers: [{ provide: TRPC_MODULE_OPTIONS, useValue: options }],
    };
  }

  async onModuleInit() {
    const httpAdapter = this.httpAdapterHost?.httpAdapter;
    if (!httpAdapter) {
      return;
    }

    this.consoleLogger.setContext(LOGGER_CONTEXT);
    await this.trpcDriver.start(this.options);
    this.consoleLogger.log(
      'Server has been initialized successfully.',
      'TRPC Server',
    );
  }
}
