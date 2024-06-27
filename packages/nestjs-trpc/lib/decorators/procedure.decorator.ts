import {
  applyDecorators,
  createParamDecorator,
  ExecutionContext,
  SetMetadata,
} from '@nestjs/common';
import { ZodSchema } from 'zod';
import { PROCEDURE_METADATA_KEY, PROCEDURE_TYPE_KEY } from '../trpc.constants';
import { Procedure } from '../trpc.enum';

export function Query(args?: { input?: ZodSchema; output?: ZodSchema }) {
  return applyDecorators(
    ...[
      SetMetadata(PROCEDURE_TYPE_KEY, Procedure.Query),
      SetMetadata(PROCEDURE_METADATA_KEY, args),
    ],
  );
}

export function Mutation(args?: { input?: ZodSchema; output?: ZodSchema }) {
  return applyDecorators(
    ...[
      SetMetadata(PROCEDURE_TYPE_KEY, Procedure.Mutation),
      SetMetadata(PROCEDURE_METADATA_KEY, args),
    ],
  );
}
