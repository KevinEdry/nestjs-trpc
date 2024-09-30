import { ProcedureParams } from '@trpc/server';
import { ResolveOptions } from '@trpc/server/dist/core/internals/utils';

export type ProcedureOptions = ResolveOptions<ProcedureParams> & {
  type: string;
  path: string;
  rawInput: string;
};
