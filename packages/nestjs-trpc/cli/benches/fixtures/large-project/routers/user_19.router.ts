import { Router, Query, Mutation } from 'nestjs-trpc';
import { z } from 'zod';

const user19Schema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  createdAt: z.date(),
});

@Router({ alias: 'users19' })
export class User19Router {
  @Query({
    input: z.object({ id: z.string() }),
    output: user19Schema,
  })
  getUser19(id: string) {
    return {
      id,
      name: 'User 19',
      email: 'user19@test.com',
      createdAt: new Date(),
    };
  }

  @Mutation({
    input: z.object({ name: z.string(), email: z.string() }),
    output: user19Schema,
  })
  createUser19(name: string, email: string) {
    return { id: 'new-19', name, email, createdAt: new Date() };
  }

  @Query({
    input: z.object({ search: z.string().optional() }),
    output: z.array(user19Schema),
  })
  listUsers19(search?: string) {
    return [];
  }
}
