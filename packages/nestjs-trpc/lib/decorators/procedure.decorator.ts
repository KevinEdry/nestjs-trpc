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
