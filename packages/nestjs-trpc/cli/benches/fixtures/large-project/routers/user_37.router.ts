import { Router, Query, Mutation } from 'nestjs-trpc';
import { z } from 'zod';

const user37Schema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  createdAt: z.date(),
});

@Router({ alias: 'users37' })
export class User37Router {
  @Query({
    input: z.object({ id: z.string() }),
    output: user37Schema,
  })
  getUser37(id: string) {
    return {
      id,
      name: 'User 37',
      email: 'user37@test.com',
      createdAt: new Date(),
    };
  }

  @Mutation({
    input: z.object({ name: z.string(), email: z.string() }),
    output: user37Schema,
  })
  createUser37(name: string, email: string) {
    return { id: 'new-37', name, email, createdAt: new Date() };
  }

  @Query({
    input: z.object({ search: z.string().optional() }),
    output: z.array(user37Schema),
  })
  listUsers37(search?: string) {
    return [];
  }
}
