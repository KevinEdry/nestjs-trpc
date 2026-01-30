import { Router, Query, Mutation } from 'nestjs-trpc';
import { z } from 'zod';

const user34Schema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  createdAt: z.date(),
});

@Router({ alias: 'users34' })
export class User34Router {
  @Query({
    input: z.object({ id: z.string() }),
    output: user34Schema,
  })
  getUser34(id: string) {
    return {
      id,
      name: 'User 34',
      email: 'user34@test.com',
      createdAt: new Date(),
    };
  }

  @Mutation({
    input: z.object({ name: z.string(), email: z.string() }),
    output: user34Schema,
  })
  createUser34(name: string, email: string) {
    return { id: 'new-34', name, email, createdAt: new Date() };
  }

  @Query({
    input: z.object({ search: z.string().optional() }),
    output: z.array(user34Schema),
  })
  listUsers34(search?: string) {
    return [];
  }
}
