import { ConsoleLogger, Inject, Injectable, Type } from '@nestjs/common';
import { HttpAdapterHost, ModuleRef } from '@nestjs/core';
import type { Application as ExpressApplication } from 'express';
import type { FastifyInstance as FastifyApplication } from 'fastify';
import { TRPCContext, TRPCModuleOptions } from './interfaces';
import { AnyRouter, initTRPC } from '@trpc/server';
import { TRPCFactory } from './factories/trpc.factory';
import { AppRouterHost } from './app-router.host';
import { ExpressDriver, FastifyDriver } from './drivers';

function isExpressApplication(app: any): app is ExpressApplication {
  return (
    typeof app === 'function' &&
    typeof app.get === 'function' &&
    typeof app.post === 'function' &&
    typeof app.use === 'function' &&
    typeof app.listen === 'function'
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
  @Inject(HttpAdapterHost)
  protected readonly httpAdapterHost!: HttpAdapterHost;

  @Inject(TRPCFactory)
  protected readonly trpcFactory!: TRPCFactory;

  @Inject(ConsoleLogger)
  protected readonly consoleLogger!: ConsoleLogger;

  @Inject(AppRouterHost)
  protected readonly appRouterHost!: AppRouterHost;

  @Inject(ExpressDriver)
  protected readonly expressDriver!: ExpressDriver;

  @Inject(FastifyDriver)
  protected readonly fastifyDriver!: FastifyDriver;

  constructor(private moduleRef: ModuleRef) {}

  public async start(options: TRPCModuleOptions) {
    //@ts-expect-error Ignoring typescript here since it's the same type, yet it still isn't able to infer it.
    const { procedure, router } = initTRPC.context().create({
      ...(options.transformer != null
        ? { transformer: options.transformer }
        : {}),
      ...(options.errorFormatter != null
        ? { errorFormatter: options.errorFormatter }
        : {}),
    });

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

    const { httpAdapter } = this.httpAdapterHost;
    const platformName = httpAdapter.getType();

    const app = httpAdapter.getInstance<
      ExpressApplication | FastifyApplication
    >();

    if (platformName === 'express' && isExpressApplication(app)) {
      await this.expressDriver.start(options, app, appRouter, contextInstance);
    } else if (platformName === 'fastify' && isFastifyApplication(app)) {
      await this.fastifyDriver.start(options, app, appRouter, contextInstance);
    } else {
      throw new Error(`Unsupported http adapter: ${platformName}`);
    }
  }
}
