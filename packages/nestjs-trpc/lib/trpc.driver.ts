import { ConsoleLogger, Inject, Injectable, Type } from '@nestjs/common';
import { ApplicationConfig, HttpAdapterHost, ModuleRef } from '@nestjs/core';
import type { Application as ExpressApplication } from 'express';
import { TRPCContext, TRPCModuleOptions } from './interfaces';
import { AnyRouter, initTRPC } from '@trpc/server';
import * as trpcExpress from '@trpc/server/adapters/express';
import { TRPCFactory } from './factories/trpc.factory';
import { TRPCGenerator } from './generators/trpc.generator';
import { Class } from 'type-fest';

@Injectable()
export class TRPCDriver<
  TOptions extends Record<string, any> = TRPCModuleOptions,
> {
  @Inject(HttpAdapterHost)
  protected readonly httpAdapterHost!: HttpAdapterHost;

  @Inject(TRPCFactory)
  protected readonly trpcFactory!: TRPCFactory;

  @Inject(TRPCGenerator)
  protected readonly trpcGenerator!: TRPCGenerator;

  @Inject(ConsoleLogger)
  protected readonly consoleLogger!: ConsoleLogger;
  
  constructor(private moduleRef: ModuleRef) {}

  public async start(options: TRPCModuleOptions) {
    const { httpAdapter } = this.httpAdapterHost;
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

    const contextClass = options.context;
    const contextInstance = contextClass != null ? this.moduleRef.get<Type<TRPCContext>, TRPCContext>(
      contextClass,
      {
        strict: false,
      },
    ) : null;
    
    app.use(
      options.basePath ?? '/trpc',
      trpcExpress.createExpressMiddleware({
        router: appRouter,
        ...(options.context != null && contextInstance != null
          ? {
              createContext: (opts) => contextInstance.create(opts),
            }
          : {}),
      }),
    );

    if (options.autoSchemaFile != null) {
      await this.trpcGenerator.generateSchemaFile(options.autoSchemaFile);
      await this.trpcGenerator.generateHelpersFile(options.context);
    } else {
      this.consoleLogger.log(
        'Skipping appRouter types generation - `autoSchemaFile` was not provided.',
        'TRPC Driver',
      );
    }
  }
}
