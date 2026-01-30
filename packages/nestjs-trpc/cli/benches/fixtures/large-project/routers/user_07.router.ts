import { Router, Query, Mutation } from 'nestjs-trpc';
import { z } from 'zod';

const user07Schema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  createdAt: z.date(),
});

@Router({ alias: 'users07' })
export class User07Router {
  @Query({
    input: z.object({ id: z.string() }),
    output: user07Schema,
  })
  getUser07(id: string) {
    return {
      id,
      name: 'User 07',
      email: 'user07@test.com',
      createdAt: new Date(),
    };
  }

  @Mutation({
    input: z.object({ name: z.string(), email: z.string() }),
    output: user07Schema,
  })
  createUser07(name: string, email: string) {
    return { id: 'new-07', name, email, createdAt: new Date() };
  }

  @Query({
    input: z.object({ search: z.string().optional() }),
    output: z.array(user07Schema),
  })
  listUsers07(search?: string) {
    return [];
  }
}
