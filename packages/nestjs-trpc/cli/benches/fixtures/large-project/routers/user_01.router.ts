import { Router, Query, Mutation } from 'nestjs-trpc';
import { z } from 'zod';

const user01Schema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  createdAt: z.date(),
});

@Router({ alias: 'users01' })
export class User01Router {
  @Query({
    input: z.object({ id: z.string() }),
    output: user01Schema,
  })
  getUser01(id: string) {
    return {
      id,
      name: 'User 01',
      email: 'user01@test.com',
      createdAt: new Date(),
    };
  }

  @Mutation({
    input: z.object({ name: z.string(), email: z.string() }),
    output: user01Schema,
  })
  createUser01(name: string, email: string) {
    return { id: 'new-01', name, email, createdAt: new Date() };
  }

  @Query({
    input: z.object({ search: z.string().optional() }),
    output: z.array(user01Schema),
  })
  listUsers01(search?: string) {
    return [];
  }
}
