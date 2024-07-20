import { MIDDLEWARE_KEY } from '../trpc.constants';
import { TRPCMiddleware } from '../interfaces';
import { isFunction } from 'lodash';
import { validateEach } from '../utils/validate-each.util';

/**
 * TODO: Generate Return Context Type.
 *
 * Decorator that binds middlewares to the scope of the router or a procedure,
 * depending on its context.
 *
 * When `@Middlewares` is used at the router level, the middleware will be
 * applied to every handler (method) in the router.
 *
 * When `@Middlewares` is used at the individual handler level, the middleware
 * will apply only to that specific method.
 *
 * @param middleware a single middleware instance or class, or a list of middleware instances
 * or classes.
 *
 * @see [Middlewares](https://nestjs-trpc.io/docs/middlewares)
 *
 * @publicApi
 */
export function Middlewares(
  middleware?: TRPCMiddleware | Function,
): MethodDecorator & ClassDecorator {
  return (
    target: any,
    key?: string | symbol,
    descriptor?: TypedPropertyDescriptor<any>,
  ) => {
    const isMiddlewareValid = <T extends Function | Record<string, any>>(
      middleware: T,
    ) =>
      middleware &&
      (isFunction(middleware) ||
        isFunction((middleware as Record<string, any>).use));

    if (descriptor) {
      validateEach(
        target.constructor,
        [middleware],
        isMiddlewareValid,
        '@Middlewares',
        'middleware',
      );
      Reflect.defineMetadata(MIDDLEWARE_KEY, middleware, descriptor.value);
      return descriptor;
    }
    validateEach(
      target.constructor,
      [middleware],
      isMiddlewareValid,
      '@Middlewares',
      'middleware',
    );
    Reflect.defineMetadata(MIDDLEWARE_KEY, middleware, target);
    return target;
  };
}
