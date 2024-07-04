import { Inject } from '@nestjs/common';
import { Router, Query, Procedure } from 'nestjs-trpc';
import { UserService } from './user.service';
import { ProtectedProcedure } from './protected.procedure';

@Router()
export class UserRouter {
  constructor(@Inject(UserService) private readonly userService: UserService) {}

  @Procedure(ProtectedProcedure)
  @Query()
  authors() {
    return this.userService.test();
  }
}
