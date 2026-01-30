import { Router, Query, Mutation } from 'nestjs-trpc';
import { z } from 'zod';

const user35Schema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  createdAt: z.date(),
});

@Router({ alias: 'users35' })
export class User35Router {
  @Query({
    input: z.object({ id: z.string() }),
    output: user35Schema,
  })
  getUser35(id: string) {
    return {
      id,
      name: 'User 35',
      email: 'user35@test.com',
      createdAt: new Date(),
    };
  }

  @Mutation({
    input: z.object({ name: z.string(), email: z.string() }),
    output: user35Schema,
  })
  createUser35(name: string, email: string) {
    return { id: 'new-35', name, email, createdAt: new Date() };
  }

  @Query({
    input: z.object({ search: z.string().optional() }),
    output: z.array(user35Schema),
  })
  listUsers35(search?: string) {
    return [];
  }
}
