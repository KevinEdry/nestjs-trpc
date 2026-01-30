import { Router, Query, Mutation } from 'nestjs-trpc';
import { z } from 'zod';

const user27Schema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  createdAt: z.date(),
});

@Router({ alias: 'users27' })
export class User27Router {
  @Query({
    input: z.object({ id: z.string() }),
    output: user27Schema,
  })
  getUser27(id: string) {
    return {
      id,
      name: 'User 27',
      email: 'user27@test.com',
      createdAt: new Date(),
    };
  }

  @Mutation({
    input: z.object({ name: z.string(), email: z.string() }),
    output: user27Schema,
  })
  createUser27(name: string, email: string) {
    return { id: 'new-27', name, email, createdAt: new Date() };
  }

  @Query({
    input: z.object({ search: z.string().optional() }),
    output: z.array(user27Schema),
  })
  listUsers27(search?: string) {
    return [];
  }
}
