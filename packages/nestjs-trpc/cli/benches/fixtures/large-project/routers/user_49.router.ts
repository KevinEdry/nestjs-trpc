import { Router, Query, Mutation } from 'nestjs-trpc';
import { z } from 'zod';

const user49Schema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  createdAt: z.date(),
});

@Router({ alias: 'users49' })
export class User49Router {
  @Query({
    input: z.object({ id: z.string() }),
    output: user49Schema,
  })
  getUser49(id: string) {
    return {
      id,
      name: 'User 49',
      email: 'user49@test.com',
      createdAt: new Date(),
    };
  }

  @Mutation({
    input: z.object({ name: z.string(), email: z.string() }),
    output: user49Schema,
  })
  createUser49(name: string, email: string) {
    return { id: 'new-49', name, email, createdAt: new Date() };
  }

  @Query({
    input: z.object({ search: z.string().optional() }),
    output: z.array(user49Schema),
  })
  listUsers49(search?: string) {
    return [];
  }
}
