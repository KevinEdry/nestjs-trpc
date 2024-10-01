import type { CreateExpressContextOptions } from '@trpc/server/adapters/express';
import type { CreateFastifyContextOptions } from '@trpc/server/adapters/fastify';

export type ContextOptions =
  | CreateExpressContextOptions
  | CreateFastifyContextOptions;

export interface TRPCContext {
  create(
    opts: ContextOptions,
  ): Record<string, unknown> | Promise<Record<string, unknown>>;
}
