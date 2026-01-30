import { Router, Query, Mutation } from 'nestjs-trpc';
import { z } from 'zod';

const user06Schema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  createdAt: z.date(),
});

@Router({ alias: 'users06' })
export class User06Router {
  @Query({
    input: z.object({ id: z.string() }),
    output: user06Schema,
  })
  getUser06(id: string) {
    return {
      id,
      name: 'User 06',
      email: 'user06@test.com',
      createdAt: new Date(),
    };
  }

  @Mutation({
    input: z.object({ name: z.string(), email: z.string() }),
    output: user06Schema,
  })
  createUser06(name: string, email: string) {
    return { id: 'new-06', name, email, createdAt: new Date() };
  }

  @Query({
    input: z.object({ search: z.string().optional() }),
    output: z.array(user06Schema),
  })
  listUsers06(search?: string) {
    return [];
  }
}
