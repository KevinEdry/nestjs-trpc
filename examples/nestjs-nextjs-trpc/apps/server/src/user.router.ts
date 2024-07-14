import { Router, Query, Input } from 'nestjs-trpc';
import { z } from 'zod';

@Router({ alias: 'users' })
export class UserRouter {
  @Query({
    input: z.object({
      name: z.string(),
    }),
    output: z.string(),
  })
  getHello(@Input('name') str: string): string {
    console.log({ str });
    return str;
  }
}
