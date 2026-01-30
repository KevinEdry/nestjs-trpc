import { Router, Query, Mutation } from 'nestjs-trpc';
import { z } from 'zod';

const user09Schema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  createdAt: z.date(),
});

@Router({ alias: 'users09' })
export class User09Router {
  @Query({
    input: z.object({ id: z.string() }),
    output: user09Schema,
  })
  getUser09(id: string) {
    return {
      id,
      name: 'User 09',
      email: 'user09@test.com',
      createdAt: new Date(),
    };
  }

  @Mutation({
    input: z.object({ name: z.string(), email: z.string() }),
    output: user09Schema,
  })
  createUser09(name: string, email: string) {
    return { id: 'new-09', name, email, createdAt: new Date() };
  }

  @Query({
    input: z.object({ search: z.string().optional() }),
    output: z.array(user09Schema),
  })
  listUsers09(search?: string) {
    return [];
  }
}
