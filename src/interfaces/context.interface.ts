import type { CreateExpressContextOptions } from '@trpc/server/adapters/express';

export type ExpressContextOptions = CreateExpressContextOptions;

export interface TRPCContext {
  create(
    opts: ExpressContextOptions,
  ): Record<string, unknown> | Promise<Record<string, unknown>>;
}
