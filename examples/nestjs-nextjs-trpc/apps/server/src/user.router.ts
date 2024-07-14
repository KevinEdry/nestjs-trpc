import { Router, Query } from 'nestjs-trpc';

@Router({ alias: 'users' })
export class UserRouter {
  @Query()
  getUserById(): string {
    return 'bla';
  }
}
