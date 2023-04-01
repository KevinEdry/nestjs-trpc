import { Inject } from '@nestjs/common';
import { ApplicationConfig, HttpAdapterHost } from '@nestjs/core';
import type { Application as ExpressApplication } from 'express';
import { TrpcModuleOptions } from './interfaces/trpc-module-options.interface';
import { initTRPC } from '@trpc/server';
import * as trpcExpress from '@trpc/server/adapters/express';

export class TrpcDriver<
  TOptions extends Record<string, any> = TrpcModuleOptions,
> {
  @Inject()
  protected readonly httpAdapterHost!: HttpAdapterHost;

  @Inject()
  protected readonly applicationConfig?: ApplicationConfig;

  // @Inject()
  // protected readonly graphQlFactory: GraphQLFactory;

  public start(options: TrpcModuleOptions) {
    const httpAdapter = this.httpAdapterHost.httpAdapter;
    const platformName = httpAdapter.getType();

    if (platformName !== 'express') {
      throw new Error(`No support for current HttpAdapter: ${platformName}`);
    }

    const t = initTRPC.create();

    //TODO: Generate routers from controllers.
    //TODO: Merge routers to the app router.
    const appRouter = t.router({});

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
