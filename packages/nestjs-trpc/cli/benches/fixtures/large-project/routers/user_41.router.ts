import { Router, Query, Mutation } from 'nestjs-trpc';
import { z } from 'zod';

const user41Schema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  createdAt: z.date(),
});

@Router({ alias: 'users41' })
export class User41Router {
  @Query({
    input: z.object({ id: z.string() }),
    output: user41Schema,
  })
  getUser41(id: string) {
    return {
      id,
      name: 'User 41',
      email: 'user41@test.com',
      createdAt: new Date(),
    };
  }

  @Mutation({
    input: z.object({ name: z.string(), email: z.string() }),
    output: user41Schema,
  })
  createUser41(name: string, email: string) {
    return { id: 'new-41', name, email, createdAt: new Date() };
  }

  @Query({
    input: z.object({ search: z.string().optional() }),
    output: z.array(user41Schema),
  })
  listUsers41(search?: string) {
    return [];
  }
}
