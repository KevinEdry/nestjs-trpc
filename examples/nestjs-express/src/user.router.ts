import { Inject } from '@nestjs/common';
import {
  Router,
  Query,
  Middlewares,
  Input,
  Context,
  Options,
} from 'nestjs-trpc';
import { UserService } from './user.service';
import { ProtectedMiddleware } from './protected.middleware';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { User, userSchema } from './user.schema';

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
    @Context() ctx: unknown,
    @Options() opts: unknown,
  ): Promise<User> {
    const user = await this.userService.getUser(userId);
    console.log({ ctx, opts });

    if (user == null) {
      throw new TRPCError({
        message: 'Could not find user.',
        code: 'NOT_FOUND',
      });
    }

    return user;
  }
}
