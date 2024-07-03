import { initTRPC } from '@trpc/server';

const t = initTRPC.meta().context().create();

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
}
