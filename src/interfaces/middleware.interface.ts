import {
  type DataTransformerOptions,
  ProcedureBuilder,
  type RootConfig,
  type unsetMarker,
  Simplify,
  ProcedureType,
} from '@trpc/server';
import type { MiddlewareResult } from '@trpc/server/dist/core/middleware';

type ProcedureParams = {
  _config: RootConfig<{
    ctx: Record<string, unknown>;
    meta: object;
    errorShape: never;
    transformer: DataTransformerOptions;
  }>;
  _ctx_out: Record<string, unknown>;
  _input_in: typeof unsetMarker;
  _input_out: typeof unsetMarker;
  _output_in: typeof unsetMarker;
  _output_out: typeof unsetMarker;
  _meta: object;
};

type SimplifiedMiddlewareResult = {
  ctx: Record<string, unknown>;
};

export type MiddlewareResponse =
  | Promise<MiddlewareResult<ProcedureParams>>
  | (<$Context>(opts: {
      ctx: $Context;
    }) => Promise<MiddlewareResult<ProcedureParams>>);

export type MiddlewareOptions<TContext extends object = object> = {
  ctx: TContext;
  type: ProcedureType;
  path: string;
  input: unknown;
  rawInput: unknown;
  meta: unknown;
  next: (opts?: {
    ctx: Record<string, unknown>;
  }) => Promise<MiddlewareResult<ProcedureParams>>;
};

export interface TRPCMiddleware {
  use(
    opts: MiddlewareOptions,
  ): MiddlewareResponse | Promise<MiddlewareResponse>;
}
