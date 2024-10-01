import { Injectable } from '@nestjs/common';
import type { Application as ExpressApplication } from 'express';
import { TRPCContext, TRPCModuleOptions } from '../interfaces';
import type { AnyRouter } from '@trpc/server';
import * as trpcExpress from '@trpc/server/adapters/express';

@Injectable()
export class ExpressDriver<
  TOptions extends Record<string, any> = TRPCModuleOptions,
> {
  public async start(
    options: TRPCModuleOptions,
    app: ExpressApplication,
    appRouter: AnyRouter,
    contextInstance: TRPCContext | null,
  ) {
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
  }
}
