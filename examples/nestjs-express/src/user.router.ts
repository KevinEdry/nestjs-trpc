import { Inject } from '@nestjs/common';
import {
  Router,
  Query,
  Middlewares,
  Input,
  Context,
  Options,
  ProcedureOptions,
} from 'nestjs-trpc';
import { UserService } from './user.service';
import { ProtectedMiddleware } from './protected.middleware';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { User, userSchema } from './user.schema';
import { ProtectedMiddlewareContext } from 'nestjs-trpc/dist/types';

@Router({ alias: 'users' })
export class UserRouter {
  constructor(@Inject(UserService) private readonly userService: UserService) {}

  @Query({
    input: z.object({ userId: z.string() }),
    output: userSchema,
  })
  @Middlewares(ProtectedMiddleware)
  async getUserById(
    @Input('userId') userId: string,
    @Context() ctx: ProtectedMiddlewareContext,
    @Options() opts: ProcedureOptions,
  ): Promise<User> {
    const user = await this.userService.getUser(userId);

    if (ctx.ben) {
      throw new TRPCError({
        message: 'Could not find user.',
        code: 'NOT_FOUND',
      });
    }

    return user;
  }
}
