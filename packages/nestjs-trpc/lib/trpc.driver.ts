import { Inject, Injectable } from '@nestjs/common';
import { ApplicationConfig, HttpAdapterHost } from '@nestjs/core';
import type { Application as ExpressApplication } from 'express';
import { TRPCModuleOptions } from './interfaces/trpc-module-options.interface';
import { initTRPC } from '@trpc/server';
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

  public async start(options: TRPCModuleOptions) {
    const httpAdapter = this.httpAdapterHost.httpAdapter;
    const platformName = httpAdapter.getType();

    if (platformName !== 'express') {
      //TODO: Add support for Fastify
      throw new Error(`No support for current HttpAdapter: ${platformName}`);
    }

    const { procedure, mergeRouters, router } = initTRPC.create();

    //TODO: Generate routers from controllers.
    //TODO: Merge routers to the app router.
    const appRouter = await this.trpcFactory.generateRoutes(
      router,
      mergeRouters,
      procedure,
    );

    await this.trpcFactory.generateAppRouter(options.outputAppRouterFile);

    const app = httpAdapter.getInstance<ExpressApplication>();
    app.use(
      options.basePath ?? '/trpc',
      trpcExpress.createExpressMiddleware({
        router: appRouter,
      }),
    );
  }

  //   public generateSchema(options: TOptions): Promise<GraphQLSchema> | null {
  //     return this.graphQlFactory.generateSchema(options);
  //   }
}
