import { DataTransformerOptions, RootConfig } from '@trpc/server';
import { ResolveOptions } from '@trpc/server/dist/core/internals/utils';

export type ProcedureOptions = ResolveOptions<{
  _config: RootConfig<{
    ctx: object;
    meta: object;
    errorShape: never;
    transformer: DataTransformerOptions;
  }>;
  _ctx_out: object;
  readonly _input_in: unique symbol;
  readonly _input_out: unique symbol;
  readonly _output_in: unique symbol;
  readonly _output_out: unique symbol;
  _meta: object;
}>;
