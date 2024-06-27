import {
  Procedure,
  ProcedureRouterRecord,
  AnyRouter,
  AnyRootConfig,
  ProcedureBuilder,
  RootConfig,
  DataTransformerOptions,
  unsetMarker,
  ProcedureType,
  Router,
} from '@trpc/server';
import { RouterDef } from '@trpc/server/dist/core/router';
import { ZodSchema } from 'zod';

export interface ProcedureInstance {
  type: ProcedureType;
  input: ZodSchema | undefined;
  output: ZodSchema | undefined;
  name: string;
  implementation: ({ input, output }) => any;
}

export interface RouterInstance {
  name: string;
  instance: unknown;
  options: unknown;
}

export interface RoutersMetadata {
  name: string;
  instance: RouterInstance;
  procedures: Array<ProcedureInstance>;
}

export type TRPCRouter = <TProcRouterRecord extends ProcedureRouterRecord>(
  procedures: TProcRouterRecord,
) => AnyRouter;

export type TRPCMergeRoutes = <TRouters extends AnyRouter[]>(
  ...routerList_0: TRouters
) => Router<
  RouterDef<
    AnyRootConfig,
    {},
    { queries: {}; mutations: {}; subscriptions: {} }
  >
>;

export type TRPCPublicProcedure = ProcedureBuilder<{
  _config: RootConfig<{
    ctx: object;
    meta: object;
    errorShape: never;
    transformer: DataTransformerOptions;
  }>;
  _ctx_out: object;
  _input_in: typeof unsetMarker;
  _input_out: typeof unsetMarker;
  _output_in: typeof unsetMarker;
  _output_out: typeof unsetMarker;
  _meta: object;
}>;
