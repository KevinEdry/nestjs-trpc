import { Inject, Injectable } from '@nestjs/common';
import { ApplicationConfig, HttpAdapterHost } from '@nestjs/core';
import type { Application as ExpressApplication } from 'express';
import { TrpcModuleOptions } from './interfaces/trpc-module-options.interface';
import { initTRPC } from '@trpc/server';
import * as trpcExpress from '@trpc/server/adapters/express';
import { TrpcFactory } from './trpc.factory';

@Injectable()
export class TrpcDriver<
  TOptions extends Record<string, any> = TrpcModuleOptions,
> {
  @Inject()
  protected readonly httpAdapterHost!: HttpAdapterHost;

  @Inject()
  protected readonly applicationConfig?: ApplicationConfig;

  @Inject()
  protected readonly trpcFactory: TrpcFactory;

  public start(options: TrpcModuleOptions) {
    const httpAdapter = this.httpAdapterHost.httpAdapter;
    const platformName = httpAdapter.getType();

    if (platformName !== 'express') {
      throw new Error(`No support for current HttpAdapter: ${platformName}`);
    }

    const t = initTRPC.create();
    const router = t.router;
    const publicProcedure = t.procedure;

    const a = router({ user: publicProcedure.use()})

    //TODO: Generate routers from controllers.
    //TODO: Merge routers to the app router.
    const routes = this.trpcFactory.generateSchema(router, publicProcedure);
    const appRouter = t.router(routes);

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
