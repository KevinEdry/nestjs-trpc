import { Inject, Injectable, Type } from '@nestjs/common';
import type { LoggerService } from '@nestjs/common';
import { HttpAdapterHost, ModuleRef } from '@nestjs/core';
import type { Application as ExpressApplication } from 'express';
import type { FastifyInstance as FastifyApplication } from 'fastify';
import {
  TRPCContext,
  TRPCErrorHandler,
  TRPCMiddleware,
  TRPCModuleOptions,
} from './interfaces';
import type { TRPCPublicProcedure } from './interfaces';
import { AnyRouter, initTRPC } from '@trpc/server';
import { TRPCFactory } from './factories/trpc.factory';
import { AppRouterHost } from './app-router.host';
import { ExpressDriver, FastifyDriver, NodeDriver } from './drivers';
import type { NodeApplication } from './drivers';
import { TRPC_LOGGER } from './trpc.constants';
import {
  resolveTRPCOptions,
  splitTRPCOptions,
} from './utils/trpc-options.util';

function isExpressApplication(app: any): app is ExpressApplication {
  return (
    typeof app === 'function' &&
    typeof app.get === 'function' &&
    typeof app.post === 'function' &&
    typeof app.use === 'function' &&
    typeof app.listen === 'function'
  );
}

function isNodeApplication(app: any): app is NodeApplication {
  return (
    typeof app === 'function' &&
    typeof app.get === 'function' &&
    typeof app.post === 'function' &&
    typeof app.use === 'function' &&
    typeof app.handle === 'function'
  );
}

function isFastifyApplication(app: any): app is FastifyApplication {
  return (
    typeof app === 'object' &&
    app !== null &&
    typeof app.get === 'function' &&
    typeof app.post === 'function' &&
    typeof app.register === 'function' &&
    typeof app.listen === 'function'
  );
}

@Injectable()
export class TRPCDriver<
  TOptions extends Record<string, any> = TRPCModuleOptions,
> {
  constructor(
    @Inject(HttpAdapterHost)
    protected readonly httpAdapterHost: HttpAdapterHost,
    protected readonly trpcFactory: TRPCFactory,
    @Inject(TRPC_LOGGER) protected readonly logger: LoggerService,
    protected readonly appRouterHost: AppRouterHost,
    protected readonly expressDriver: ExpressDriver,
    protected readonly fastifyDriver: FastifyDriver,
    protected readonly nodeDriver: NodeDriver,
    @Inject(ModuleRef) protected readonly moduleRef: ModuleRef,
  ) {}

  public async start(options: TRPCModuleOptions) {
    const { rootConfig, adapterOptions } = splitTRPCOptions(
      resolveTRPCOptions(options, this.logger),
    );

    const { procedure: baseProcedure, router } = initTRPC
      .context()
      .create(rootConfig);

    const procedure = this.applyGlobalMiddlewares(
      baseProcedure,
      options.globalMiddlewares,
    );

    const appRouter: AnyRouter = this.trpcFactory.serializeAppRoutes(
      router,
      procedure,
    );

    this.appRouterHost.appRouter = appRouter;

    const contextClass = options.context;
    const contextInstance =
      contextClass != null
        ? this.moduleRef.get<Type<TRPCContext>, TRPCContext>(contextClass, {
            strict: false,
          })
        : null;

    const onErrorClass = options.onError;
    const onErrorInstance =
      onErrorClass != null
        ? this.moduleRef.get<Type<TRPCErrorHandler>, TRPCErrorHandler>(
            onErrorClass,
            { strict: false },
          )
        : null;

    const { httpAdapter } = this.httpAdapterHost;
    const platformName = httpAdapter.getType();

    const app = httpAdapter.getInstance<
      ExpressApplication | FastifyApplication | NodeApplication
    >();

    if (platformName === 'express' && isExpressApplication(app)) {
      await this.expressDriver.start(
        options,
        app,
        appRouter,
        contextInstance,
        onErrorInstance,
        adapterOptions,
      );
    } else if (platformName === 'node' && isNodeApplication(app)) {
      await this.nodeDriver.start(
        options,
        app,
        appRouter,
        contextInstance,
        onErrorInstance,
        adapterOptions,
      );
    } else if (platformName === 'fastify' && isFastifyApplication(app)) {
      await this.fastifyDriver.start(
        options,
        app,
        appRouter,
        contextInstance,
        onErrorInstance,
        adapterOptions,
      );
    } else {
      throw new Error(`Unsupported http adapter: ${platformName}`);
    }
  }

  private applyGlobalMiddlewares(
    procedure: TRPCPublicProcedure,
    globalMiddlewares: TRPCModuleOptions['globalMiddlewares'],
  ): TRPCPublicProcedure {
    if (globalMiddlewares == null || globalMiddlewares.length === 0) {
      return procedure;
    }

    for (const middleware of globalMiddlewares) {
      const instance = this.moduleRef.get<TRPCMiddleware>(middleware, {
        strict: false,
      });
      if (typeof instance.use === 'function') {
        //@ts-expect-error this is expected since the type is correct.
        procedure = procedure.use((opts) => instance.use(opts));
      }
    }

    return procedure;
  }
}
