import type { TRPCProcedureType } from '@trpc/server';

export type MiddlewareResponse = Promise<
  { ok: true; data: unknown } | { ok: false; error: unknown }
>;

export type MiddlewareOptions<
  TContext extends object = object,
  TMeta = unknown,
> = {
  ctx: TContext;
  type: TRPCProcedureType;
  path: string;
  input: unknown;
  getRawInput: () => Promise<unknown>;
  meta: TMeta;
  signal: AbortSignal | undefined;
  next: (opts?: { ctx?: Record<string, unknown> }) => MiddlewareResponse;
};

export interface TRPCMiddleware<TMeta = unknown> {
  use(
    opts: MiddlewareOptions<object, TMeta>,
  ): MiddlewareResponse | Promise<MiddlewareResponse>;
}
