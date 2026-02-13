import type {
  TRPCErrorFormatter,
  TRPCDefaultErrorShape,
  DataTransformer,
  CombinedDataTransformer,
} from '@trpc/server';
import type { LoggerService } from '@nestjs/common';
import { TRPCContext } from './context.interface';
import type { TRPCErrorHandler } from './error-handler.interface';
import type { TRPCMiddleware } from './middleware.interface';
import type { Class, Constructor } from 'type-fest';

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
}
