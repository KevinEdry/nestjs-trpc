import { ZodSchema } from 'zod';
import { applyDecorators, SetMetadata } from '@nestjs/common';
import { PROCEDURE_METADATA_KEY, PROCEDURE_TYPE_KEY } from '../trpc.constants';
import { ProcedureType } from '../trpc.enum';

/**
 * TODO: Add documentation
 *
 * @param args
 * @constructor
 */
export function Mutation(args?: { input?: ZodSchema; output?: ZodSchema }) {
  return applyDecorators(
    ...[
      SetMetadata(PROCEDURE_TYPE_KEY, ProcedureType.Mutation),
      SetMetadata(PROCEDURE_METADATA_KEY, args),
    ],
  );
}