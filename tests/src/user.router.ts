import { Inject } from '@nestjs/common';
import { Router, Query, Mutation } from 'nestjs-trpc';
import { z } from 'zod';
import { UserService } from './user.service';
import { userSchema } from './user.schema';

const innerSchema = z.object({
  bla: z.string(),
});

const outputSchema = z.object({
  linoy: z.array(innerSchema),
  magniva: z.object({
    placeholder: z.enum(['bla']),
  }),
});

@Router()
export class UserRouter {
  constructor(@Inject(UserService) private readonly userService: UserService) {}

  @Query({ input: z.union([outputSchema, userSchema]) })
  authors() {
    return this.userService.test();
  }
}
