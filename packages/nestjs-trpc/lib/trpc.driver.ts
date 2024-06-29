import { ConsoleLogger, Inject, Injectable } from '@nestjs/common';
import { ApplicationConfig, HttpAdapterHost } from '@nestjs/core';
import type { Application as ExpressApplication } from 'express';
import { TRPCModuleOptions } from './interfaces';
import { AnyRouter, initTRPC } from '@trpc/server';
import * as trpcExpress from '@trpc/server/adapters/express';
import { TRPCFactory } from './trpc.factory';

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

  @Inject()
  protected readonly consoleLogger: ConsoleLogger;

  public async start(options: TRPCModuleOptions) {
    const httpAdapter = this.httpAdapterHost.httpAdapter;
    const platformName = httpAdapter.getType();

    if (platformName !== 'express') {
      //TODO: Add support for Fastify
      throw new Error(`No support for current HttpAdapter: ${platformName}`);
    }

    const app = httpAdapter.getInstance<ExpressApplication>();

    const createContext = ({
      req,
      res,
    }: trpcExpress.CreateExpressContextOptions) => ({}); // no context
    type Context = Awaited<ReturnType<typeof createContext>>;

    const { procedure, router } = initTRPC.context<Context>().create();

    const appRouter: AnyRouter = await this.trpcFactory.generateRoutes(
      router,
      procedure,
    );

    app.use(
      '/trpc',
      trpcExpress.createExpressMiddleware({
        router: appRouter,
        createContext,
      }),
    );

    if (
      options.generateAppRouter === true ||
      options.generateAppRouter == null
    ) {
      if (options.outputAppRouterFile != null) {
        await this.trpcFactory.generateAppRouter(options.outputAppRouterFile);
      } else {
        this.consoleLogger.log(
          'Skipping appRouter types generation - `outputAppRouterFile` was not provided.',
        );
      }
    }
  }
}
