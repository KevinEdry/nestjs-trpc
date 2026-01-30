import { Router, Query, Mutation } from 'nestjs-trpc';
import { z } from 'zod';

const user10Schema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  createdAt: z.date(),
});

@Router({ alias: 'users10' })
export class User10Router {
  @Query({
    input: z.object({ id: z.string() }),
    output: user10Schema,
  })
  getUser10(id: string) {
    return {
      id,
      name: 'User 10',
      email: 'user10@test.com',
      createdAt: new Date(),
    };
  }

  @Mutation({
    input: z.object({ name: z.string(), email: z.string() }),
    output: user10Schema,
  })
  createUser10(name: string, email: string) {
    return { id: 'new-10', name, email, createdAt: new Date() };
  }

  @Query({
    input: z.object({ search: z.string().optional() }),
    output: z.array(user10Schema),
  })
  listUsers10(search?: string) {
    return [];
  }
}
