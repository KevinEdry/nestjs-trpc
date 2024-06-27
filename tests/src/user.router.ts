import { Inject } from '@nestjs/common';
import { Router, Query, Mutation, Output } from 'nestjs-trpc';
import { z } from 'zod';
import { UserService } from './user.service';

const outputSchema = z.object({
  linoy: z.string(),
  kimhi: z.number(),
});

@Router()
export class UserRouter {
  constructor(@Inject(UserService) private readonly userService: UserService) {}

  @Query({ output: z.object({ bla: z.string() }) })
  authors() {
    return this.userService.test();
  }

  @Mutation({
    input: z.string(),
    output: outputSchema,
  })
  createAuthor(input: string, @Output() output: string) {
    return 'bla';
  }
}
