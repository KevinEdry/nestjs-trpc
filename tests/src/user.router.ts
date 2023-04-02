import { Router, Query, Mutation } from 'nestjs-trpc';
import { z } from 'zod';

@Router()
export class UserRouter {
  @Query({ output: z.string() })
  authors() {
    return 'bla';
  }

  @Mutation({ input: z.string(), output: z.string() })
  createAuthor(input: string) {
    return 'bla';
  }
}
