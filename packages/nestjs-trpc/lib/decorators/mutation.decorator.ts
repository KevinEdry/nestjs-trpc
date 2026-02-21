import { applyDecorators, SetMetadata } from '@nestjs/common';
import { PROCEDURE_METADATA_KEY, PROCEDURE_TYPE_KEY } from '../trpc.constants';
import { ProcedureType } from '../trpc.enum';
import type { Parser } from '../interfaces/parser.interface';

/**
 * Decorator that marks a router class method as a TRPC mutation procedure that can receive inbound
 * requests and produce responses.
 *
 * An TRPC query procedure is mainly responsible for actions that modify or creates server-side data.
 * for example `Mutation /trpc/userRouter.createUser`.
 *
 * @param {object} args configuration object specifying:
 * - `input` - defines a schema validation logic for the input.
 * - `output` - defines a schema validation logic for the output.
 *
 * @see [Method Decorators](https://nestjs-trpc.io/docs/routers#procedures)
 *
 * @publicApi
 */
export function Mutation(args?: {
  input?: Parser;
  output?: Parser;
  meta?: Record<string, unknown>;
}) {
  return applyDecorators(
    ...[
      SetMetadata(PROCEDURE_TYPE_KEY, ProcedureType.Mutation),
      SetMetadata(PROCEDURE_METADATA_KEY, args),
    ],
  );
}
