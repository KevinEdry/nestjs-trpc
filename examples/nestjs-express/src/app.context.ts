import { Inject, Injectable } from '@nestjs/common';
import { ExpressContextOptions, TRPCContext } from 'nestjs-trpc';
import { UserService } from './user.service';

@Injectable()
export class AppContext implements TRPCContext {
  constructor(@Inject(UserService) private readonly userService: UserService) {}

  async create(opts: ExpressContextOptions): Promise<Record<string, unknown>> {
    const res = await this.userService.test();
    return {
      req: opts.req,
      auth: {
        user: res,
      },
    };
  }
}
