import { Inject } from '@nestjs/common';
import { Router, Query, Procedure } from 'nestjs-trpc';
import { UserService } from './user.service';
import { ProtectedProcedure } from './protected.procedure';
import { z } from 'zod';

const bobj = z.object({
  bla: z.array(z.object({
    yaya: z.string(),
  }))
})

const newZodSchema = z.array(z.object(
  {
    a: z.string(),
    b: bobj,
  }
))

@Router({alias: "leRouter"})
export class UserRouter {
  constructor(@Inject(UserService) private readonly userService: UserService) {}

  @Procedure(ProtectedProcedure)
  @Query({input: z.string(), output: newZodSchema})
  authors(args) {
    console.log({args})
    return this.userService.test();
  }
}
