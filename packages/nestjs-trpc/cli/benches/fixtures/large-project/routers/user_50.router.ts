import { Router, Query, Mutation } from 'nestjs-trpc';
import { z } from 'zod';

const user50Schema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  createdAt: z.date(),
});

@Router({ alias: 'users50' })
export class User50Router {
  @Query({
    input: z.object({ id: z.string() }),
    output: user50Schema,
  })
  getUser50(id: string) {
    return {
      id,
      name: 'User 50',
      email: 'user50@test.com',
      createdAt: new Date(),
    };
  }

  @Mutation({
    input: z.object({ name: z.string(), email: z.string() }),
    output: user50Schema,
  })
  createUser50(name: string, email: string) {
    return { id: 'new-50', name, email, createdAt: new Date() };
  }

  @Query({
    input: z.object({ search: z.string().optional() }),
    output: z.array(user50Schema),
  })
  listUsers50(search?: string) {
    return [];
  }
}
