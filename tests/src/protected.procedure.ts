import { TRPCProcedure } from 'nestjs-trpc';
import { TRPCError } from '@trpc/server';

interface Context {
  auth : {
    user?: string;
  }
}

export class ProtectedProcedure implements TRPCProcedure<Context> {
  use = ((opts) => {
    const { ctx, next } = opts;

    if (ctx.auth.user == null) {
      throw new TRPCError({ code: 'UNAUTHORIZED' });
    }

    return next({
      ctx: {
        user: opts.ctx.auth.user,
      },
    });
  }) satisfies TRPCProcedure<Context>["use"]
}

export type ProtectedProcedureContext = {
  ctx: {
    user: string;
  };
};
