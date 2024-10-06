import {
  MiddlewareOptions,
  MiddlewareResponse,
  TRPCMiddleware,
} from 'nestjs-trpc';
import { Inject, Injectable } from '@nestjs/common';
import { UserService } from './user.service';

@Injectable()
export class ProtectedMiddleware implements TRPCMiddleware {
  constructor(@Inject(UserService) private readonly userService: UserService) {}
  async use(opts: MiddlewareOptions<object>): Promise<MiddlewareResponse> {
    return opts.next({
      ctx: {
        ben: 1,
      },
    });
  }
}
