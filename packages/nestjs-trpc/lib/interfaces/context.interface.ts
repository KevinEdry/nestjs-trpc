import type { CreateExpressContextOptions } from '@trpc/server/adapters/express';
import type { CreateFastifyContextOptions } from '@trpc/server/adapters/fastify';
import type { CreateHTTPContextOptions } from '@trpc/server/adapters/standalone';

export type ContextOptions =
  | CreateExpressContextOptions
  | CreateFastifyContextOptions
  | CreateHTTPContextOptions;

export interface TRPCContext {
  create(
    opts: ContextOptions,
  ): Record<string, unknown> | Promise<Record<string, unknown>>;
}
