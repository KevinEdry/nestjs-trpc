import { Router, Query, Mutation } from 'nestjs-trpc';
import { z } from 'zod';

const user21Schema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  createdAt: z.date(),
});

@Router({ alias: 'users21' })
export class User21Router {
  @Query({
    input: z.object({ id: z.string() }),
    output: user21Schema,
  })
  getUser21(id: string) {
    return {
      id,
      name: 'User 21',
      email: 'user21@test.com',
      createdAt: new Date(),
    };
  }

  @Mutation({
    input: z.object({ name: z.string(), email: z.string() }),
    output: user21Schema,
  })
  createUser21(name: string, email: string) {
    return { id: 'new-21', name, email, createdAt: new Date() };
  }

  @Query({
    input: z.object({ search: z.string().optional() }),
    output: z.array(user21Schema),
  })
  listUsers21(search?: string) {
    return [];
  }
}
