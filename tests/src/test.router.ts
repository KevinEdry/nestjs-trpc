import { Inject } from '@nestjs/common';
import { Router, Query, Mutation } from 'nestjs-trpc';
import { z } from 'zod';
import { UserService } from './user.service';

const outputSchema = z.object({
  linoy: z.string(),
  magniva: z.object({
    placeholder: z.enum(['bla']),
  }),
});

@Router()
export class TestRouter {
  constructor(@Inject(UserService) private readonly userService: UserService) {}

  @Query({ output: z.object({ bla: z.string() }) })
  authors() {
    return this.userService.test();
  }

  @Mutation({
    input: z.number(),
    output: outputSchema,
  })
  createAuthor(input: string, output: string) {
    return 'bla';
  }
}
