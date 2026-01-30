import { Router, Query, Mutation } from 'nestjs-trpc';
import { z } from 'zod';

const user11Schema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  createdAt: z.date(),
});

@Router({ alias: 'users11' })
export class User11Router {
  @Query({
    input: z.object({ id: z.string() }),
    output: user11Schema,
  })
  getUser11(id: string) {
    return {
      id,
      name: 'User 11',
      email: 'user11@test.com',
      createdAt: new Date(),
    };
  }

  @Mutation({
    input: z.object({ name: z.string(), email: z.string() }),
    output: user11Schema,
  })
  createUser11(name: string, email: string) {
    return { id: 'new-11', name, email, createdAt: new Date() };
  }

  @Query({
    input: z.object({ search: z.string().optional() }),
    output: z.array(user11Schema),
  })
  listUsers11(search?: string) {
    return [];
  }
}
