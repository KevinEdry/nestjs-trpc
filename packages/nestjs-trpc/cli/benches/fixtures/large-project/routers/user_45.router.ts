import { Router, Query, Mutation } from 'nestjs-trpc';
import { z } from 'zod';

const user45Schema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  createdAt: z.date(),
});

@Router({ alias: 'users45' })
export class User45Router {
  @Query({
    input: z.object({ id: z.string() }),
    output: user45Schema,
  })
  getUser45(id: string) {
    return {
      id,
      name: 'User 45',
      email: 'user45@test.com',
      createdAt: new Date(),
    };
  }

  @Mutation({
    input: z.object({ name: z.string(), email: z.string() }),
    output: user45Schema,
  })
  createUser45(name: string, email: string) {
    return { id: 'new-45', name, email, createdAt: new Date() };
  }

  @Query({
    input: z.object({ search: z.string().optional() }),
    output: z.array(user45Schema),
  })
  listUsers45(search?: string) {
    return [];
  }
}
