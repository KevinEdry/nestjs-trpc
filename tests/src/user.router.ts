import { Router, Query, Mutation } from 'nestjs-trpc';
import { z } from 'zod';

@Router()
export class UserRouter {
  @Query({ response: z.string() })
  authors() {
    return 'bla';
  }

  @Mutation({ input: z.string(), response: z.string() })
  createAuthor(input: string) {
    return 'bla';
  }
}
