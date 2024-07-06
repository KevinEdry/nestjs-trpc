import {
  type DataTransformerOptions, ProcedureBuilder,
  type RootConfig,
  type unsetMarker,
} from '@trpc/server';

type ProcedureParams<Context = any> = {
  _config: RootConfig<{
    ctx: object & Context;
    meta: object;
    errorShape: never;
    transformer: DataTransformerOptions;
  }>;
  _ctx_out: object & Context;
  _input_in: typeof unsetMarker;
  _input_out: typeof unsetMarker;
  _output_in: typeof unsetMarker;
  _output_out: typeof unsetMarker;
  _meta: object;
}

export interface TRPCProcedure<Context = object> {
  use: Parameters<ProcedureBuilder<ProcedureParams<Context>>["use"]>[0]
}