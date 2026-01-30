import { Router, Query, Mutation } from 'nestjs-trpc';
import { z } from 'zod';

const user13Schema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  createdAt: z.date(),
});

@Router({ alias: 'users13' })
export class User13Router {
  @Query({
    input: z.object({ id: z.string() }),
    output: user13Schema,
  })
  getUser13(id: string) {
    return {
      id,
      name: 'User 13',
      email: 'user13@test.com',
      createdAt: new Date(),
    };
  }

  @Mutation({
    input: z.object({ name: z.string(), email: z.string() }),
    output: user13Schema,
  })
  createUser13(name: string, email: string) {
    return { id: 'new-13', name, email, createdAt: new Date() };
  }

  @Query({
    input: z.object({ search: z.string().optional() }),
    output: z.array(user13Schema),
  })
  listUsers13(search?: string) {
    return [];
  }
}
