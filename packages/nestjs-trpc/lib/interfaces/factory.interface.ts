import type {
  ProcedureRouterRecord,
  AnyRouter,
  AnyRootConfig,
  ProcedureBuilder,
  RootConfig,
  DataTransformerOptions,
  unsetMarker,
  ProcedureType,
  Router,
  ProcedureParams,
} from '@trpc/server';
import type { RouterDef } from '@trpc/server/dist/core/router';
import type { ZodSchema, ZodType, ZodTypeDef } from 'zod';
import type { TRPCMiddleware } from './middleware.interface';
import type { Class } from 'type-fest';

export enum ProcedureParamDecoratorType {
  Options = 'options',
  Ctx = 'ctx',
  Input = 'input',
  RawInput = 'rawInput',
  Type = 'type',
  Path = 'path',
}

export type ProcedureImplementation = ({
  input,
  output,
}: {
  input?: ZodType<any, ZodTypeDef, any>;
  output?: ZodType<any, ZodTypeDef, any>;
}) => any;

interface ProcedureParamDecoratorBase {
  type: ProcedureParamDecoratorType;
  index: number;
}

export type ProcedureInputParamDecorator = ProcedureParamDecoratorBase & {
  type: ProcedureParamDecoratorType.Input;
  key?: string;
};

export type ProcedureParamDecorator =
  | ProcedureParamDecoratorBase
  | ProcedureInputParamDecorator;

export interface ProcedureFactoryMetadata {
  type: ProcedureType;
  input: ZodSchema | undefined;
  output: ZodSchema | undefined;
  middlewares?: Class<TRPCMiddleware>;
  name: string;
  implementation: ProcedureImplementation;
  params: Array<ProcedureParamDecorator> | undefined;
}

export interface CustomProcedureFactoryMetadata {
  name: string;
  instance: unknown;
}

export interface RouterInstance {
  name: string;
  instance: unknown;
  alias?: string;
  middlewares?: TRPCMiddleware;
}

export interface RoutersFactoryMetadata {
  name: string;
  alias?: string;
  instance: RouterInstance;
  procedures: Array<ProcedureFactoryMetadata>;
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

export type TRPCPublicProcedure = ProcedureBuilder<ProcedureParams>;
