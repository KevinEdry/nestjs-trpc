import type {
  TRPCRouterRecord,
  AnyRouter,
  TRPCProcedureBuilder,
} from '@trpc/server';
import type { TRPCMiddleware } from './middleware.interface';
import type { Class, Constructor } from 'type-fest';
import type { ProcedureType } from '../trpc.enum';
import type { Parser } from './parser.interface';

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
  input?: Parser;
  output?: Parser;
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
  input: Parser | undefined;
  output: Parser | undefined;
  meta: Record<string, unknown> | undefined;
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
  instance: unknown;
  middlewares: Array<Class<TRPCMiddleware> | Constructor<TRPCMiddleware>>;
  alias?: string;
}

export interface RoutersFactoryMetadata {
  name: string;
  alias?: string;
  instance: RouterInstance;
  procedures: Array<ProcedureFactoryMetadata>;
}

export type TRPCRouter = <TProcRouterRecord extends TRPCRouterRecord>(
  procedures: TProcRouterRecord,
) => AnyRouter;

export type TRPCPublicProcedure = TRPCProcedureBuilder<
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any
>;
