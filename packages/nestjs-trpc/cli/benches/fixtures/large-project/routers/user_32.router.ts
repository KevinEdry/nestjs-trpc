import { Router, Query, Mutation } from 'nestjs-trpc';
import { z } from 'zod';

const user32Schema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  createdAt: z.date(),
});

@Router({ alias: 'users32' })
export class User32Router {
  @Query({
    input: z.object({ id: z.string() }),
    output: user32Schema,
  })
  getUser32(id: string) {
    return {
      id,
      name: 'User 32',
      email: 'user32@test.com',
      createdAt: new Date(),
    };
  }

  @Mutation({
    input: z.object({ name: z.string(), email: z.string() }),
    output: user32Schema,
  })
  createUser32(name: string, email: string) {
    return { id: 'new-32', name, email, createdAt: new Date() };
  }

  @Query({
    input: z.object({ search: z.string().optional() }),
    output: z.array(user32Schema),
  })
  listUsers32(search?: string) {
    return [];
  }
}
