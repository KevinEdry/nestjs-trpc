import { Router, Query, Mutation } from 'nestjs-trpc';
import { z } from 'zod';

const user26Schema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  createdAt: z.date(),
});

@Router({ alias: 'users26' })
export class User26Router {
  @Query({
    input: z.object({ id: z.string() }),
    output: user26Schema,
  })
  getUser26(id: string) {
    return {
      id,
      name: 'User 26',
      email: 'user26@test.com',
      createdAt: new Date(),
    };
  }

  @Mutation({
    input: z.object({ name: z.string(), email: z.string() }),
    output: user26Schema,
  })
  createUser26(name: string, email: string) {
    return { id: 'new-26', name, email, createdAt: new Date() };
  }

  @Query({
    input: z.object({ search: z.string().optional() }),
    output: z.array(user26Schema),
  })
  listUsers26(search?: string) {
    return [];
  }
}
