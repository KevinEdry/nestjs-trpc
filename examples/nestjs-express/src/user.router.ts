import { Inject } from '@nestjs/common';
import { Router, Query, Middlewares, Input } from 'nestjs-trpc';
import { UserService } from './user.service';
import { ProtectedProcedure } from './protected.procedure';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';

const userSchema = z.object({
  name: z.string(),
  email: z.string(),
  password: z.string(),
});

type User = z.infer<typeof userSchema>;

@Router({ alias: 'users' })
export class UserRouter {
  constructor(@Inject(UserService) private readonly userService: UserService) {}

  @Query({
    input: z.object({ userId: z.string() }),
    output: userSchema,
  })
  @Middlewares(ProtectedProcedure)
  async getUserById(@Input('userId') userId: string): Promise<User> {
    if (user == null) {
      throw new TRPCError({
        message: 'Could not find user.',
        code: 'NOT_FOUND',
      });
    }

    return user;
  }
}
