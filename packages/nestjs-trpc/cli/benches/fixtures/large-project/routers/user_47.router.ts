import { Router, Query, Mutation } from 'nestjs-trpc';
import { z } from 'zod';

const user47Schema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  createdAt: z.date(),
});

@Router({ alias: 'users47' })
export class User47Router {
  @Query({
    input: z.object({ id: z.string() }),
    output: user47Schema,
  })
  getUser47(id: string) {
    return {
      id,
      name: 'User 47',
      email: 'user47@test.com',
      createdAt: new Date(),
    };
  }

  @Mutation({
    input: z.object({ name: z.string(), email: z.string() }),
    output: user47Schema,
  })
  createUser47(name: string, email: string) {
    return { id: 'new-47', name, email, createdAt: new Date() };
  }

  @Query({
    input: z.object({ search: z.string().optional() }),
    output: z.array(user47Schema),
  })
  listUsers47(search?: string) {
    return [];
  }
}
