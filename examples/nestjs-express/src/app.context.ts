import { Injectable } from '@nestjs/common';
import { CreateExpressContextOptions } from '@trpc/server/adapters/express';

export interface TRPCContext {
  create(opts: CreateExpressContextOptions);
}

@Injectable()
export class Context implements TRPCContext {
  create(opts: CreateExpressContextOptions) {
    const { req, res } = opts;

    return {
      auth: {
        user: 'bla',
      },
    };
  }
}
