import type {
  TRPCErrorFormatter,
  TRPCDefaultErrorShape,
  DataTransformer,
  CombinedDataTransformer,
} from '@trpc/server';
import { TRPCContext } from './context.interface';
import type { Class } from 'type-fest';

export interface TRPCModuleOptions {
  basePath?: string;

  /**
   * The exposed trpc options when creating a route with either `createExpressMiddleware` or `createFastifyMiddleware`.
   * If not provided, the adapter will use a default createContext.
   * @link https://nestjs-trpc.io/docs/context
   */
  context?: Class<TRPCContext>;

  /**
   * Use custom error formatting
   * @link https://trpc.io/docs/error-formatting
   */
  errorFormatter?: TRPCErrorFormatter<any, TRPCDefaultErrorShape>;

  /**
   * Use a data transformer
   * @link https://trpc.io/docs/data-transformers
   */
  transformer?: DataTransformer | CombinedDataTransformer;
}
