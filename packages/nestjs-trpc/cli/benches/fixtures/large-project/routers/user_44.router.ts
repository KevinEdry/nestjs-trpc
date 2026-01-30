import { Router, Query, Mutation } from 'nestjs-trpc';
import { z } from 'zod';

const user44Schema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  createdAt: z.date(),
});

@Router({ alias: 'users44' })
export class User44Router {
  @Query({
    input: z.object({ id: z.string() }),
    output: user44Schema,
  })
  getUser44(id: string) {
    return {
      id,
      name: 'User 44',
      email: 'user44@test.com',
      createdAt: new Date(),
    };
  }

  @Mutation({
    input: z.object({ name: z.string(), email: z.string() }),
    output: user44Schema,
  })
  createUser44(name: string, email: string) {
    return { id: 'new-44', name, email, createdAt: new Date() };
  }

  @Query({
    input: z.object({ search: z.string().optional() }),
    output: z.array(user44Schema),
  })
  listUsers44(search?: string) {
    return [];
  }
}
