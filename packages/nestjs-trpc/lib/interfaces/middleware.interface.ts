import type { TRPCProcedureType } from '@trpc/server';

export type MiddlewareResponse = Promise<
  { ok: true; data: unknown } | { ok: false; error: unknown }
>;

export type MiddlewareOptions<TContext extends object = object> = {
  ctx: TContext;
  type: TRPCProcedureType;
  path: string;
  input: unknown;
  getRawInput: () => Promise<unknown>;
  meta: unknown;
  signal: AbortSignal | undefined;
  next: (opts?: { ctx?: Record<string, unknown> }) => MiddlewareResponse;
};

export interface TRPCMiddleware {
  use(
    opts: MiddlewareOptions,
  ): MiddlewareResponse | Promise<MiddlewareResponse>;
}
