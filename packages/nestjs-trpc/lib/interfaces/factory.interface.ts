import type {
  ProcedureRouterRecord,
  AnyRouter,
  ProcedureBuilder,
  ProcedureType,
  ProcedureParams,
} from '@trpc/server';
import type { ZodSchema, ZodType, ZodTypeDef } from 'zod';
import type { TRPCMiddleware } from './middleware.interface';
import type { Class, Constructor } from 'type-fest';

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
  middlewares: Array<Constructor<TRPCMiddleware> | Class<TRPCMiddleware>>;
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
  path: string;
  instance: unknown;
  middlewares: Array<Class<TRPCMiddleware> | Constructor<TRPCMiddleware>>;
  alias?: string;
}

export interface RoutersFactoryMetadata {
  name: string;
  path: string;
  alias?: string;
  instance: RouterInstance;
  procedures: Array<ProcedureFactoryMetadata>;
}

export type TRPCRouter = <TProcRouterRecord extends ProcedureRouterRecord>(
  procedures: TProcRouterRecord,
) => AnyRouter;

export type TRPCPublicProcedure = ProcedureBuilder<ProcedureParams>;
