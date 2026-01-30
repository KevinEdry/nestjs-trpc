import { Router, Query, Mutation } from 'nestjs-trpc';
import { z } from 'zod';

const user18Schema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  createdAt: z.date(),
});

@Router({ alias: 'users18' })
export class User18Router {
  @Query({
    input: z.object({ id: z.string() }),
    output: user18Schema,
  })
  getUser18(id: string) {
    return {
      id,
      name: 'User 18',
      email: 'user18@test.com',
      createdAt: new Date(),
    };
  }

  @Mutation({
    input: z.object({ name: z.string(), email: z.string() }),
    output: user18Schema,
  })
  createUser18(name: string, email: string) {
    return { id: 'new-18', name, email, createdAt: new Date() };
  }

  @Query({
    input: z.object({ search: z.string().optional() }),
    output: z.array(user18Schema),
  })
  listUsers18(search?: string) {
    return [];
  }
}
