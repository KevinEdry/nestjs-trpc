import { Injectable } from '@nestjs/common';
import type { FastifyInstance as FastifyApplication } from 'fastify';
import { ContextOptions, TRPCContext, TRPCModuleOptions } from '../interfaces';
import type { AnyRouter } from '@trpc/server';
import * as trpcFastify from '@trpc/server/adapters/fastify';

@Injectable()
export class FastifyDriver<
  TOptions extends Record<string, any> = TRPCModuleOptions,
> {
  public async start(
    options: TRPCModuleOptions,
    app: FastifyApplication,
    appRouter: AnyRouter,
    contextInstance: TRPCContext | null,
  ) {
    app.register(trpcFastify.fastifyTRPCPlugin, {
      prefix: options.basePath ?? '/trpc',
      trpcOptions: {
        router: appRouter,
        ...(options.context != null && contextInstance != null
          ? {
              createContext: (opts: ContextOptions) =>
                contextInstance.create(opts),
            }
          : {}),
      },
    });
  }
}
