import {
  MiddlewareOptions,
  MiddlewareResponse,
  TRPCMiddleware,
} from 'nestjs-trpc';
import { Inject, Injectable } from '@nestjs/common';
import { UserService } from './user.service';
import { TRPCError } from '@trpc/server';

import { Context } from 'nestjs-trpc/dist/types';

@Injectable()
export class ProtectedMiddleware implements TRPCMiddleware {
  constructor(@Inject(UserService) private readonly userService: UserService) {}
  async use(opts: MiddlewareOptions<Context>): Promise<MiddlewareResponse> {
    const start = Date.now();
    const result = await opts.next({
      ctx: {
        ben: 1,
      },
    });

    const durationMs = Date.now() - start;
    const meta = { path: opts.path, type: opts.type, durationMs };
    result.ok
      ? console.log('OK request timing:', meta)
      : console.error('Non-OK request timing', meta);
    return result;
  }
}
