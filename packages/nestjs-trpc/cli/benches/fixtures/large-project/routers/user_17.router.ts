import { Router, Query, Mutation } from 'nestjs-trpc';
import { z } from 'zod';

const user17Schema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  createdAt: z.date(),
});

@Router({ alias: 'users17' })
export class User17Router {
  @Query({
    input: z.object({ id: z.string() }),
    output: user17Schema,
  })
  getUser17(id: string) {
    return {
      id,
      name: 'User 17',
      email: 'user17@test.com',
      createdAt: new Date(),
    };
  }

  @Mutation({
    input: z.object({ name: z.string(), email: z.string() }),
    output: user17Schema,
  })
  createUser17(name: string, email: string) {
    return { id: 'new-17', name, email, createdAt: new Date() };
  }

  @Query({
    input: z.object({ search: z.string().optional() }),
    output: z.array(user17Schema),
  })
  listUsers17(search?: string) {
    return [];
  }
}
