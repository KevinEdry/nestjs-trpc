import { applyDecorators, SetMetadata } from '@nestjs/common';
import { ZodSchema } from 'zod';
import {
  PROCEDURE_KEY,
  PROCEDURE_METADATA_KEY,
  PROCEDURE_TYPE_KEY,
} from '../trpc.constants';
import { ProcedureType } from '../trpc.enum';
import { TRPCProcedure } from '../interfaces';
import { isFunction } from 'lodash';
import { validateEach } from '../utils/validate-each.util';

export function Query(args?: { input?: ZodSchema; output?: ZodSchema }) {
  return applyDecorators(
    ...[
      SetMetadata(PROCEDURE_TYPE_KEY, ProcedureType.Query),
      SetMetadata(PROCEDURE_METADATA_KEY, args),
    ],
  );
}

export function Mutation(args?: { input?: ZodSchema; output?: ZodSchema }) {
  return applyDecorators(
    ...[
      SetMetadata(PROCEDURE_TYPE_KEY, ProcedureType.Mutation),
      SetMetadata(PROCEDURE_METADATA_KEY, args),
    ],
  );
}


/**
 * Decorator that binds guards to the scope of the router or a procedure,
 * depending on its context.
 *
 * When `@Procedure` is used at the router level, the procedure will be
 * applied to every handler (method) in the router.
 *
 * When `@Procedure` is used at the individual handler level, the procedure
 * will apply only to that specific method.
 *
 * @param procedure a single procedure instance or class, or a list of procedure instances
 * or classes.
 *
 * @see [Procedure](https://docs.nestjs.com/guards)
 *
 * @usageNotes
 * Procedures can also be set up globally for all routers and routes
 * using a `Context`.  [See here for details](https://docs.nestjs.com/guards#binding-guards)
 *
 * @publicApi
 */
export function Procedure(
  procedure?: TRPCProcedure | Function,
): MethodDecorator & ClassDecorator {
  return (
    target: any,
    key?: string | symbol,
    descriptor?: TypedPropertyDescriptor<any>,
  ) => {
    const isProcedureValid = <T extends Function | Record<string, any>>(
      procedure: T,
    ) =>
      procedure &&
      (isFunction(procedure) ||
        isFunction((procedure as Record<string, any>).use));

    if (descriptor) {
      validateEach(
        target.constructor,
        [procedure],
        isProcedureValid,
        '@Procedure',
        'procedure',
      );
      Reflect.defineMetadata(PROCEDURE_KEY, procedure, descriptor.value);
      return descriptor;
    }
    validateEach(
      target.constructor,
      [procedure],
      isProcedureValid,
      '@Procedure',
      'procedure',
    );
    Reflect.defineMetadata(PROCEDURE_KEY, procedure, target);
    return target;
  };
}
