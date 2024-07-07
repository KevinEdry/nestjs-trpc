import * as trpcExpress from '@trpc/server/adapters/express';

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
  createContext?: (opts : trpcExpress.CreateExpressContextOptions) => ({});
}
