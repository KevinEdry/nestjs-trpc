import type { TRPCError, TRPCProcedureType } from '@trpc/server';

export interface OnErrorOptions {
  error: TRPCError;
  type: TRPCProcedureType | 'unknown';
  path: string | undefined;
  input: unknown;
  ctx: Record<string, unknown> | undefined;
  req: unknown;
}

export interface TRPCErrorHandler {
  onError(opts: OnErrorOptions): void;
}
