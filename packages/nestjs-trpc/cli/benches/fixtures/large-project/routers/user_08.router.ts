import { Router, Query, Mutation } from 'nestjs-trpc';
import { z } from 'zod';

const user08Schema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  createdAt: z.date(),
});

@Router({ alias: 'users08' })
export class User08Router {
  @Query({
    input: z.object({ id: z.string() }),
    output: user08Schema,
  })
  getUser08(id: string) {
    return {
      id,
      name: 'User 08',
      email: 'user08@test.com',
      createdAt: new Date(),
    };
  }

  @Mutation({
    input: z.object({ name: z.string(), email: z.string() }),
    output: user08Schema,
  })
  createUser08(name: string, email: string) {
    return { id: 'new-08', name, email, createdAt: new Date() };
  }

  @Query({
    input: z.object({ search: z.string().optional() }),
    output: z.array(user08Schema),
  })
  listUsers08(search?: string) {
    return [];
  }
}
