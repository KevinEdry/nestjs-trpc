import { Router, Procedure, Input } from 'nestjs-trpc';

// @Router()
export class UserRouter {
  // @Procedure()
  authors() {
    return 'bla';
  }

  // @Procedure()
  async createAuthor(input: string) {
    return 'bla';
  }
}
