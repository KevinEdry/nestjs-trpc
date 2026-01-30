import { Router, Query, Mutation } from 'nestjs-trpc';
import { z } from 'zod';

const user05Schema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  createdAt: z.date(),
});

@Router({ alias: 'users05' })
export class User05Router {
  @Query({
    input: z.object({ id: z.string() }),
    output: user05Schema,
  })
  getUser05(id: string) {
    return {
      id,
      name: 'User 05',
      email: 'user05@test.com',
      createdAt: new Date(),
    };
  }

  @Mutation({
    input: z.object({ name: z.string(), email: z.string() }),
    output: user05Schema,
  })
  createUser05(name: string, email: string) {
    return { id: 'new-05', name, email, createdAt: new Date() };
  }

  @Query({
    input: z.object({ search: z.string().optional() }),
    output: z.array(user05Schema),
  })
  listUsers05(search?: string) {
    return [];
  }
}
