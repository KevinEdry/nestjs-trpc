import { initTRPC } from '@trpc/server';

const t = initTRPC.meta().context().create();

/**
 * "TRPCModule" options object.
 */
export interface TrpcModuleOptions {
  /**
   * Path to trpc router type output.
   */
  autoRouterFile: string;

  /**
   * The base path for all trpc requests, default: "/trpc".
   */
  basePath?: string;
}
