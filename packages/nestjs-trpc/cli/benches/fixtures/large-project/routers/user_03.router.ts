import { Router, Query, Mutation } from 'nestjs-trpc';
import { z } from 'zod';

const user03Schema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  createdAt: z.date(),
});

@Router({ alias: 'users03' })
export class User03Router {
  @Query({
    input: z.object({ id: z.string() }),
    output: user03Schema,
  })
  getUser03(id: string) {
    return {
      id,
      name: 'User 03',
      email: 'user03@test.com',
      createdAt: new Date(),
    };
  }

  @Mutation({
    input: z.object({ name: z.string(), email: z.string() }),
    output: user03Schema,
  })
  createUser03(name: string, email: string) {
    return { id: 'new-03', name, email, createdAt: new Date() };
  }

  @Query({
    input: z.object({ search: z.string().optional() }),
    output: z.array(user03Schema),
  })
  listUsers03(search?: string) {
    return [];
  }
}
