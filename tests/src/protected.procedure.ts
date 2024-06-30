import { Procedure, TRPCProcedure, TRPCProcedureOptions } from 'nestjs-trpc';
import { Request, Response } from 'express';
import { TRPCError } from '@trpc/server';

interface Context {
  user?: string;
}

@Procedure()
export class ProtectedProcedure implements TRPCProcedure {
  use(opts: TRPCProcedureOptions<Context, Request, Response>) {
    const { next, ctx } = opts;

    if (ctx.user == null) {
      throw new TRPCError({ code: 'UNAUTHORIZED' });
    }

    return next({
      ctx: {
        user: opts.ctx.user,
      },
    });
  }
}

export type ProtectedProcedureContext = {
  ctx: {
    user: string;
  };
};
