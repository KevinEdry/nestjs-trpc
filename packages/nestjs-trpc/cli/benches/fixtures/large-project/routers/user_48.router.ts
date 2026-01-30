import { Router, Query, Mutation } from 'nestjs-trpc';
import { z } from 'zod';

const user48Schema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  createdAt: z.date(),
});

@Router({ alias: 'users48' })
export class User48Router {
  @Query({
    input: z.object({ id: z.string() }),
    output: user48Schema,
  })
  getUser48(id: string) {
    return {
      id,
      name: 'User 48',
      email: 'user48@test.com',
      createdAt: new Date(),
    };
  }

  @Mutation({
    input: z.object({ name: z.string(), email: z.string() }),
    output: user48Schema,
  })
  createUser48(name: string, email: string) {
    return { id: 'new-48', name, email, createdAt: new Date() };
  }

  @Query({
    input: z.object({ search: z.string().optional() }),
    output: z.array(user48Schema),
  })
  listUsers48(search?: string) {
    return [];
  }
}
