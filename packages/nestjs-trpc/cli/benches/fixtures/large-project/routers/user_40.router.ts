import { Router, Query, Mutation } from 'nestjs-trpc';
import { z } from 'zod';

const user40Schema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  createdAt: z.date(),
});

@Router({ alias: 'users40' })
export class User40Router {
  @Query({
    input: z.object({ id: z.string() }),
    output: user40Schema,
  })
  getUser40(id: string) {
    return {
      id,
      name: 'User 40',
      email: 'user40@test.com',
      createdAt: new Date(),
    };
  }

  @Mutation({
    input: z.object({ name: z.string(), email: z.string() }),
    output: user40Schema,
  })
  createUser40(name: string, email: string) {
    return { id: 'new-40', name, email, createdAt: new Date() };
  }

  @Query({
    input: z.object({ search: z.string().optional() }),
    output: z.array(user40Schema),
  })
  listUsers40(search?: string) {
    return [];
  }
}
