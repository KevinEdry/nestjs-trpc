import { Router, Query, Mutation } from 'nestjs-trpc';
import { z } from 'zod';

const user15Schema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  createdAt: z.date(),
});

@Router({ alias: 'users15' })
export class User15Router {
  @Query({
    input: z.object({ id: z.string() }),
    output: user15Schema,
  })
  getUser15(id: string) {
    return {
      id,
      name: 'User 15',
      email: 'user15@test.com',
      createdAt: new Date(),
    };
  }

  @Mutation({
    input: z.object({ name: z.string(), email: z.string() }),
    output: user15Schema,
  })
  createUser15(name: string, email: string) {
    return { id: 'new-15', name, email, createdAt: new Date() };
  }

  @Query({
    input: z.object({ search: z.string().optional() }),
    output: z.array(user15Schema),
  })
  listUsers15(search?: string) {
    return [];
  }
}
