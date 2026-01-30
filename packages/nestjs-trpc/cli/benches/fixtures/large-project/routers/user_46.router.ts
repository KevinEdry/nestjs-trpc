import { Router, Query, Mutation } from 'nestjs-trpc';
import { z } from 'zod';

const user46Schema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  createdAt: z.date(),
});

@Router({ alias: 'users46' })
export class User46Router {
  @Query({
    input: z.object({ id: z.string() }),
    output: user46Schema,
  })
  getUser46(id: string) {
    return {
      id,
      name: 'User 46',
      email: 'user46@test.com',
      createdAt: new Date(),
    };
  }

  @Mutation({
    input: z.object({ name: z.string(), email: z.string() }),
    output: user46Schema,
  })
  createUser46(name: string, email: string) {
    return { id: 'new-46', name, email, createdAt: new Date() };
  }

  @Query({
    input: z.object({ search: z.string().optional() }),
    output: z.array(user46Schema),
  })
  listUsers46(search?: string) {
    return [];
  }
}
