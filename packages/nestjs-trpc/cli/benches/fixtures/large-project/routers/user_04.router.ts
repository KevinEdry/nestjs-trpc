import { Router, Query, Mutation } from 'nestjs-trpc';
import { z } from 'zod';

const user04Schema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  createdAt: z.date(),
});

@Router({ alias: 'users04' })
export class User04Router {
  @Query({
    input: z.object({ id: z.string() }),
    output: user04Schema,
  })
  getUser04(id: string) {
    return {
      id,
      name: 'User 04',
      email: 'user04@test.com',
      createdAt: new Date(),
    };
  }

  @Mutation({
    input: z.object({ name: z.string(), email: z.string() }),
    output: user04Schema,
  })
  createUser04(name: string, email: string) {
    return { id: 'new-04', name, email, createdAt: new Date() };
  }

  @Query({
    input: z.object({ search: z.string().optional() }),
    output: z.array(user04Schema),
  })
  listUsers04(search?: string) {
    return [];
  }
}
