import { Router, Query, Mutation } from 'nestjs-trpc';
import { z } from 'zod';

const user23Schema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  createdAt: z.date(),
});

@Router({ alias: 'users23' })
export class User23Router {
  @Query({
    input: z.object({ id: z.string() }),
    output: user23Schema,
  })
  getUser23(id: string) {
    return {
      id,
      name: 'User 23',
      email: 'user23@test.com',
      createdAt: new Date(),
    };
  }

  @Mutation({
    input: z.object({ name: z.string(), email: z.string() }),
    output: user23Schema,
  })
  createUser23(name: string, email: string) {
    return { id: 'new-23', name, email, createdAt: new Date() };
  }

  @Query({
    input: z.object({ search: z.string().optional() }),
    output: z.array(user23Schema),
  })
  listUsers23(search?: string) {
    return [];
  }
}
