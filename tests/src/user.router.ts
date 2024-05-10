import { Inject } from '@nestjs/common';
import { Router, Query, Mutation } from 'nestjs-trpc';
import { z } from 'zod';
import { UserService } from './user.service';

@Router()
export class UserRouter {
  constructor(@Inject(UserService) private readonly userService: UserService) {}

  @Query({ output: z.string() })
  authors() {
    return this.userService.test();
  }

  @Mutation({ input: z.string(), output: z.string() })
  createAuthor(input: string) {
    return 'bla';
  }
}
