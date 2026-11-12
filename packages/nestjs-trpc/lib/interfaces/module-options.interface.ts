import type {
  AnyRouter,
  TRPCErrorFormatter,
  TRPCDefaultErrorShape,
  DataTransformer,
  CombinedDataTransformer,
  TRPCRuntimeConfigOptions,
} from '@trpc/server';
import type { createExpressMiddleware } from '@trpc/server/adapters/express';
import type { FastifyTRPCPluginOptions } from '@trpc/server/adapters/fastify';
import type {
  NodeHTTPHandlerOptions,
  NodeHTTPRequest,
  NodeHTTPResponse,
} from '@trpc/server/adapters/node-http';
import type { LoggerService } from '@nestjs/common';
import { TRPCContext } from './context.interface';
import type { TRPCErrorHandler } from './error-handler.interface';
import type { TRPCMiddleware } from './middleware.interface';
import type { Class, Constructor } from 'type-fest';
import type {
  TRPCSSEOptions,
  TRPCJSONLOptions,
} from './streaming-options.interface';

/**
 * Options the module owns through dependency injection (`context`, `onError`)
 * or router construction (`router`). They cannot be supplied through `trpc`.
 */
type ModuleOwnedTRPCOption = 'router' | 'createContext' | 'onError';

type NodeAdapterHandlerOptions = NodeHTTPHandlerOptions<
  AnyRouter,
  NodeHTTPRequest,
  NodeHTTPResponse
>;

export type TRPCAdapterOptions = (
  | Omit<
      Parameters<typeof createExpressMiddleware>[0],
      ModuleOwnedTRPCOption | 'middleware'
    >
  | Omit<
      FastifyTRPCPluginOptions<AnyRouter>['trpcOptions'],
      ModuleOwnedTRPCOption
    >
  | Omit<NodeAdapterHandlerOptions, ModuleOwnedTRPCOption | 'middleware'>
) & {
  middleware?: NodeAdapterHandlerOptions['middleware'];
};

export type TRPCOptions = TRPCRuntimeConfigOptions<object, object> &
  TRPCAdapterOptions &
  Partial<Record<ModuleOwnedTRPCOption, never>>;

export interface TRPCModuleOptions {
  basePath?: string;

  /**
   * The exposed trpc options when creating a route with either `createExpressMiddleware` or `createFastifyMiddleware`.
   * If not provided, the adapter will use a default createContext.
   * @link https://nestjs-trpc.io/docs/context
   */
  context?: Class<TRPCContext>;

  /**
   * Native tRPC options, spelled exactly as tRPC spells them. Root config
   * options (`transformer`, `errorFormatter`, `sse`, `jsonl`, ...) are passed
   * to `initTRPC.create()`, everything else to the active HTTP adapter.
   * The module-owned `router`, `createContext`, and `onError` options are
   * excluded - use the `context` and `onError` DI classes instead.
   * @link https://trpc.io/docs/server/adapters
   */
  trpc?: TRPCOptions;

  /**
   * Use custom error formatting
   * @deprecated Use `trpc.errorFormatter` instead. Will be removed in the next major version.
   * @link https://trpc.io/docs/error-formatting
   */
  errorFormatter?: TRPCErrorFormatter<any, TRPCDefaultErrorShape>;

  /**
   * Use a data transformer
   * @deprecated Use `trpc.transformer` instead. Will be removed in the next major version.
   * @link https://trpc.io/docs/data-transformers
   */
  transformer?: DataTransformer | CombinedDataTransformer;

  /**
   * Custom logger instance to use instead of the default NestJS ConsoleLogger.
   * Must implement the NestJS LoggerService interface.
   * @link https://docs.nestjs.com/techniques/logger
   */
  logger?: LoggerService;

  /**
   * Injectable error handler invoked whenever a tRPC procedure throws.
   * Must implement the `TRPCErrorHandler` interface.
   * @link https://trpc.io/docs/server/error-handling#handling-errors
   */
  onError?: Class<TRPCErrorHandler>;

  globalMiddlewares?: Array<
    Class<TRPCMiddleware> | Constructor<TRPCMiddleware>
  >;

  /**
   * Options for server-sent events (SSE) subscriptions, e.g. keep-alive
   * pings that prevent proxies from closing idle subscription streams.
   * @deprecated Use `trpc.sse` instead. Will be removed in the next major version.
   * @link https://trpc.io/docs/server/subscriptions
   */
  sse?: TRPCSSEOptions;

  /**
   * Options for streamed batch responses (`httpBatchStreamLink`), e.g.
   * keep-alive pings that prevent proxies from closing idle streams.
   * @deprecated Use `trpc.jsonl` instead. Will be removed in the next major version.
   * @link https://trpc.io/docs/client/links/httpBatchStreamLink
   */
  jsonl?: TRPCJSONLOptions;
}
