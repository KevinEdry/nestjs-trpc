import { Router, Query, Mutation } from 'nestjs-trpc';
import { z } from 'zod';

const user33Schema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  createdAt: z.date(),
});

@Router({ alias: 'users33' })
export class User33Router {
  @Query({
    input: z.object({ id: z.string() }),
    output: user33Schema,
  })
  getUser33(id: string) {
    return {
      id,
      name: 'User 33',
      email: 'user33@test.com',
      createdAt: new Date(),
    };
  }

  @Mutation({
    input: z.object({ name: z.string(), email: z.string() }),
    output: user33Schema,
  })
  createUser33(name: string, email: string) {
    return { id: 'new-33', name, email, createdAt: new Date() };
  }

  @Query({
    input: z.object({ search: z.string().optional() }),
    output: z.array(user33Schema),
  })
  listUsers33(search?: string) {
    return [];
  }
}
