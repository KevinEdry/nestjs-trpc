import { Router, Query, Mutation } from 'nestjs-trpc';
import { z } from 'zod';

const user39Schema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  createdAt: z.date(),
});

@Router({ alias: 'users39' })
export class User39Router {
  @Query({
    input: z.object({ id: z.string() }),
    output: user39Schema,
  })
  getUser39(id: string) {
    return {
      id,
      name: 'User 39',
      email: 'user39@test.com',
      createdAt: new Date(),
    };
  }

  @Mutation({
    input: z.object({ name: z.string(), email: z.string() }),
    output: user39Schema,
  })
  createUser39(name: string, email: string) {
    return { id: 'new-39', name, email, createdAt: new Date() };
  }

  @Query({
    input: z.object({ search: z.string().optional() }),
    output: z.array(user39Schema),
  })
  listUsers39(search?: string) {
    return [];
  }
}
