import type { CreateExpressContextOptions } from '@trpc/server/adapters/express';
import { RootConfigTypes } from '@trpc/server/dist/core/internals/config';
import { ErrorFormatter } from '@trpc/server/dist/error/formatter';
import { TRPCErrorShape } from '@trpc/server/dist/rpc';

/**
 * "TRPCModule" options object.
 */
export interface TRPCModuleOptions {
  /**
   * Path to trpc router and helpers types output.
   */
  autoSchemaFile?: string;

  /**
   * The base path for all trpc requests.
   * @default "/trpc"
   */
  basePath?: string;

  /**
   * The exposed trpc options when creating a route with `createExpressMiddleware`.
   * If not provided, the adapter will use a default createContext.
   */
  createContext?: (opts: CreateExpressContextOptions) => {};

  /**
   * Use custom error formatting
   * @link https://trpc.io/docs/error-formatting
   */
  errorShape?: ErrorFormatter<
    RootConfigTypes['ctx'],
    TRPCErrorShape<number> & { [key: string]: any }
  >;

  /**
   * Use a data transformer
   * @link https://trpc.io/docs/data-transformers
   */
  transformer?: RootConfigTypes['transformer'];
}
