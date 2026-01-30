import { Router, Query, Mutation } from 'nestjs-trpc';
import { z } from 'zod';

const user14Schema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  createdAt: z.date(),
});

@Router({ alias: 'users14' })
export class User14Router {
  @Query({
    input: z.object({ id: z.string() }),
    output: user14Schema,
  })
  getUser14(id: string) {
    return {
      id,
      name: 'User 14',
      email: 'user14@test.com',
      createdAt: new Date(),
    };
  }

  @Mutation({
    input: z.object({ name: z.string(), email: z.string() }),
    output: user14Schema,
  })
  createUser14(name: string, email: string) {
    return { id: 'new-14', name, email, createdAt: new Date() };
  }

  @Query({
    input: z.object({ search: z.string().optional() }),
    output: z.array(user14Schema),
  })
  listUsers14(search?: string) {
    return [];
  }
}
