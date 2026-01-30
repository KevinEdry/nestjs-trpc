import { Router, Query, Mutation } from 'nestjs-trpc';
import { z } from 'zod';

const user42Schema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  createdAt: z.date(),
});

@Router({ alias: 'users42' })
export class User42Router {
  @Query({
    input: z.object({ id: z.string() }),
    output: user42Schema,
  })
  getUser42(id: string) {
    return {
      id,
      name: 'User 42',
      email: 'user42@test.com',
      createdAt: new Date(),
    };
  }

  @Mutation({
    input: z.object({ name: z.string(), email: z.string() }),
    output: user42Schema,
  })
  createUser42(name: string, email: string) {
    return { id: 'new-42', name, email, createdAt: new Date() };
  }

  @Query({
    input: z.object({ search: z.string().optional() }),
    output: z.array(user42Schema),
  })
  listUsers42(search?: string) {
    return [];
  }
}
