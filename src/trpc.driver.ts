import { ConsoleLogger, Inject, Injectable, Type } from '@nestjs/common';
import { ApplicationConfig, HttpAdapterHost, ModuleRef } from '@nestjs/core';
import type { Application as ExpressApplication } from 'express';
import { TRPCContext, TRPCModuleOptions } from './interfaces';
import { AnyRouter, initTRPC } from '@trpc/server';
import * as trpcExpress from '@trpc/server/adapters/express';
import { TRPCFactory } from './factories/trpc.factory';

@Injectable()
export class TRPCDriver<
  TOptions extends Record<string, any> = TRPCModuleOptions,
> {
  @Inject()
  protected readonly httpAdapterHost!: HttpAdapterHost;

  @Inject()
  protected readonly applicationConfig?: ApplicationConfig;

  @Inject()
  protected readonly trpcFactory: TRPCFactory;

  @Inject(ModuleRef) protected readonly moduleRef: ModuleRef;

  @Inject()
  protected readonly consoleLogger: ConsoleLogger;

  public async start(options: TRPCModuleOptions) {
    const httpAdapter = this.httpAdapterHost.httpAdapter;
    const platformName = httpAdapter.getType();

    if (platformName !== 'express') {
      //TODO: Add support for Fastify through different drivers
      throw new Error(`No support for current HttpAdapter: ${platformName}`);
    }

    const app = httpAdapter.getInstance<ExpressApplication>();

    //@ts-ignore Ignoring typescript here since its the same type yet it still isn't able to infer it.
    const { procedure, router } = initTRPC.context().create({
      ...(options.transformer != null
        ? { transformer: options.transformer }
        : {}),
      ...(options.errorShape != null ? { errorShape: options.errorShape } : {}),
    });

    const appRouter: AnyRouter = this.trpcFactory.serializeAppRoutes(
      router,
      procedure,
    );

    let contextInstance;
    const contextClass = options.context;
    if (contextClass != null) {
      contextInstance = this.moduleRef.get<Type<TRPCContext>, TRPCContext>(
        //@ts-ignore
        contextClass,
        {
          strict: false,
        },
      );
    }

    app.use(
      options.basePath ?? '/trpc',
      trpcExpress.createExpressMiddleware({
        router: appRouter,
        ...(options.context != null
          ? {
              createContext: (opts) => contextInstance.create(opts),
            }
          : {}),
      }),
    );

    if (options.autoSchemaFile != null) {
      await this.trpcFactory.generateSchemaFiles(options.autoSchemaFile);
    } else {
      this.consoleLogger.log(
        'Skipping appRouter types generation - `autoSchemaFile` was not provided.',
        'TRPC Driver',
      );
    }
  }
}
