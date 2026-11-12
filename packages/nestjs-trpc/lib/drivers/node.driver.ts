import { Injectable } from '@nestjs/common';
import type { IncomingMessage, ServerResponse } from 'node:http';
import {
  TRPCAdapterOptions,
  TRPCContext,
  TRPCErrorHandler,
  TRPCModuleOptions,
} from '../interfaces';
import type { AnyRouter } from '@trpc/server';
import { nodeHTTPRequestHandler } from '@trpc/server/adapters/node-http';

export interface NodeApplication {
  use(
    path: string,
    middleware: (req: IncomingMessage, res: ServerResponse) => void,
  ): unknown;
}

@Injectable()
export class NodeDriver<
  TOptions extends Record<string, any> = TRPCModuleOptions,
> {
  public async start(
    options: TRPCModuleOptions,
    app: NodeApplication,
    appRouter: AnyRouter,
    contextInstance: TRPCContext | null,
    onErrorInstance: TRPCErrorHandler | null,
    adapterOptions: TRPCAdapterOptions = {},
  ) {
    app.use(options.basePath ?? '/trpc', (req, res) => {
      const procedurePath = new URL(
        req.url ?? '',
        'http://127.0.0.1',
      ).pathname.slice(1);

      void nodeHTTPRequestHandler<AnyRouter, IncomingMessage, ServerResponse>({
        ...adapterOptions,
        router: appRouter,
        path: procedurePath,
        req,
        res,
        ...(options.context != null && contextInstance != null
          ? {
              createContext: (opts) => contextInstance.create(opts),
            }
          : {}),
        ...(options.onError != null && onErrorInstance != null
          ? {
              onError: (opts) => onErrorInstance.onError(opts),
            }
          : {}),
      });
    });
  }
}
