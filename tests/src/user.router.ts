import { Inject } from '@nestjs/common';
import { Router, Query, Procedure } from 'nestjs-trpc';
import { UserService } from './user.service';
import { ProtectedProcedure } from './protected.procedure';
import { z } from 'zod';

@Router({alias: "leRouter"})
export class UserRouter {
  constructor(@Inject(UserService) private readonly userService: UserService) {}

  @Procedure(ProtectedProcedure)
  @Query({input: z.string()})
  authors(args) {
    console.log({args})
    return this.userService.test();
  }
}
