import { Router, Query, Mutation } from 'nestjs-trpc';
import { z } from 'zod';

const user38Schema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  createdAt: z.date(),
});

@Router({ alias: 'users38' })
export class User38Router {
  @Query({
    input: z.object({ id: z.string() }),
    output: user38Schema,
  })
  getUser38(id: string) {
    return {
      id,
      name: 'User 38',
      email: 'user38@test.com',
      createdAt: new Date(),
    };
  }

  @Mutation({
    input: z.object({ name: z.string(), email: z.string() }),
    output: user38Schema,
  })
  createUser38(name: string, email: string) {
    return { id: 'new-38', name, email, createdAt: new Date() };
  }

  @Query({
    input: z.object({ search: z.string().optional() }),
    output: z.array(user38Schema),
  })
  listUsers38(search?: string) {
    return [];
  }
}
