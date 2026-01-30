import { Router, Query, Mutation } from 'nestjs-trpc';
import { z } from 'zod';

const user28Schema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  createdAt: z.date(),
});

@Router({ alias: 'users28' })
export class User28Router {
  @Query({
    input: z.object({ id: z.string() }),
    output: user28Schema,
  })
  getUser28(id: string) {
    return {
      id,
      name: 'User 28',
      email: 'user28@test.com',
      createdAt: new Date(),
    };
  }

  @Mutation({
    input: z.object({ name: z.string(), email: z.string() }),
    output: user28Schema,
  })
  createUser28(name: string, email: string) {
    return { id: 'new-28', name, email, createdAt: new Date() };
  }

  @Query({
    input: z.object({ search: z.string().optional() }),
    output: z.array(user28Schema),
  })
  listUsers28(search?: string) {
    return [];
  }
}
