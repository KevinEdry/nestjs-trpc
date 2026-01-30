import { Router, Query, Mutation } from 'nestjs-trpc';
import { z } from 'zod';

const user29Schema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  createdAt: z.date(),
});

@Router({ alias: 'users29' })
export class User29Router {
  @Query({
    input: z.object({ id: z.string() }),
    output: user29Schema,
  })
  getUser29(id: string) {
    return {
      id,
      name: 'User 29',
      email: 'user29@test.com',
      createdAt: new Date(),
    };
  }

  @Mutation({
    input: z.object({ name: z.string(), email: z.string() }),
    output: user29Schema,
  })
  createUser29(name: string, email: string) {
    return { id: 'new-29', name, email, createdAt: new Date() };
  }

  @Query({
    input: z.object({ search: z.string().optional() }),
    output: z.array(user29Schema),
  })
  listUsers29(search?: string) {
    return [];
  }
}
