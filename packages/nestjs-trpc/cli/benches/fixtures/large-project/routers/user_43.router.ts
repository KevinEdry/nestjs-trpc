import { Router, Query, Mutation } from 'nestjs-trpc';
import { z } from 'zod';

const user43Schema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  createdAt: z.date(),
});

@Router({ alias: 'users43' })
export class User43Router {
  @Query({
    input: z.object({ id: z.string() }),
    output: user43Schema,
  })
  getUser43(id: string) {
    return {
      id,
      name: 'User 43',
      email: 'user43@test.com',
      createdAt: new Date(),
    };
  }

  @Mutation({
    input: z.object({ name: z.string(), email: z.string() }),
    output: user43Schema,
  })
  createUser43(name: string, email: string) {
    return { id: 'new-43', name, email, createdAt: new Date() };
  }

  @Query({
    input: z.object({ search: z.string().optional() }),
    output: z.array(user43Schema),
  })
  listUsers43(search?: string) {
    return [];
  }
}
