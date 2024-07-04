import * as trpcExpress from '@trpc/server/adapters/express';

/**
 * "TRPCModule" options object.
 */
export interface TRPCModuleOptions {
  /**
   * Path to trpc router type output.
   */
  autoSchemaFile?: string;

  /**
   * The base path for all trpc requests.
   * @default "/trpc"
   */
  basePath?: string;

  /**
   * The exposed trpc options when creating a route with `createExpressMiddleware`.
   * If none options are provided, the adapter will use the default options.
   */
  createContext?: (opts : trpcExpress.CreateExpressContextOptions) => ({});
}
