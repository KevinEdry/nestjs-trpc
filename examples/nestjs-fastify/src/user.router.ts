import { Inject } from '@nestjs/common';
import {
  Router,
  Query,
  Mutation,
  UseMiddlewares,
  Input,
  Ctx,
  Options,
  ProcedureOptions,
} from 'nestjs-trpc';
import { UserService } from './user.service';
import { ProtectedMiddleware } from './protected.middleware';
import { RolesMiddleware } from './roles.middleware';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { User, userSchema } from './user.schema';
import { LoggingMiddleware } from './logging.middleware';

@UseMiddlewares(LoggingMiddleware)
@Router({ alias: 'users' })
export class UserRouter {
  constructor(@Inject(UserService) private readonly userService: UserService) {}

  @Query({
    input: z.object({ userId: z.string() }),
    output: userSchema,
  })
  @UseMiddlewares(ProtectedMiddleware)
  async getUserById(
    @Input('userId') userId: string,
    @Ctx() ctx: object,
    @Options() opts: ProcedureOptions,
  ): Promise<User> {
    const user = await this.userService.getUser(userId);

    if (!ctx) {
      throw new TRPCError({
        message: 'Could not find user.',
        code: 'NOT_FOUND',
      });
    }

    return user;
  }

  @Mutation({
    input: z.object({ userId: z.string() }),
    meta: { roles: ['admin'] },
  })
  @UseMiddlewares(RolesMiddleware)
  async deleteUser(@Input('userId') userId: string): Promise<string> {
    return `User ${userId} deleted.`;
  }
}
