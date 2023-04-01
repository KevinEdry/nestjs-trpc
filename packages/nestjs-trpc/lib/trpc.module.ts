import { Inject, Module, RequestMethod } from '@nestjs/common';
import {
  DynamicModule,
  OnModuleDestroy,
  OnModuleInit,
  Provider,
} from '@nestjs/common/interfaces';
import { HttpAdapterHost } from '@nestjs/core';
import { TrpcModuleOptions } from './interfaces/trpc-module-options.interface';
import { TRPC_MODULE_OPTIONS } from './trpc.constants';
import { TrpcDriver } from './trpc.driver';

@Module({
  imports: [],
  providers: [],
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
  }
}
