import { Inject, Module } from '@nestjs/common';
import { DynamicModule, OnModuleInit } from '@nestjs/common/interfaces';
import { HttpAdapterHost, MetadataScanner } from '@nestjs/core';
import { TRPCModuleOptions } from './interfaces/trpc-module-options.interface';
import { TRPC_MODULE_OPTIONS } from './trpc.constants';
import { TRPCDriver } from './trpc.driver';
import { TRPCFactory } from './trpc.factory';
import { TRPCGenerator } from './trpc.generator';

@Module({
  imports: [],
  providers: [TRPCDriver, TRPCFactory, MetadataScanner, TRPCGenerator],
  exports: [],
})
export class TRPCModule implements OnModuleInit {
  constructor(
    @Inject(TRPC_MODULE_OPTIONS) private readonly options: TRPCModuleOptions,
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
    console.log('TRPC Started');
  }
}
