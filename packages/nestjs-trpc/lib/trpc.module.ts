import { Inject, Module, RequestMethod } from '@nestjs/common';
import {
  DynamicModule,
  OnModuleDestroy,
  OnModuleInit,
  Provider,
} from '@nestjs/common/interfaces';
import { HttpAdapterHost, MetadataScanner } from '@nestjs/core';
import { InstanceWrapper } from '@nestjs/core/injector/instance-wrapper';
import { ModulesContainer } from '@nestjs/core/injector/modules-container';
import { TrpcModuleOptions } from './interfaces/trpc-module-options.interface';
import { ROUTER_METADATA_KEY, TRPC_MODULE_OPTIONS } from './trpc.constants';
import { TrpcDriver } from './trpc.driver';
import { isObject } from '@nestjs/common/utils/shared.utils';
import { TrpcFactory } from './trpc.factory';

@Module({
  imports: [],
  providers: [TrpcDriver, TrpcFactory, MetadataScanner],
  exports: [],
})
export class TrpcModule implements OnModuleInit {
  constructor(
    @Inject(TRPC_MODULE_OPTIONS) private readonly options: TrpcModuleOptions,
    private readonly httpAdapterHost: HttpAdapterHost,
    private readonly trpcDriver: TrpcDriver,
  ) {}

  static forRoot<TOptions extends Record<string, any> = TrpcModuleOptions>(
    options: TOptions = {} as TOptions,
  ): DynamicModule {
    return {
      module: TrpcModule,
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
