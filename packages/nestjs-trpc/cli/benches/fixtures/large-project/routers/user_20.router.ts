import { Router, Query, Mutation } from 'nestjs-trpc';
import { z } from 'zod';

const user20Schema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  createdAt: z.date(),
});

@Router({ alias: 'users20' })
export class User20Router {
  @Query({
    input: z.object({ id: z.string() }),
    output: user20Schema,
  })
  getUser20(id: string) {
    return {
      id,
      name: 'User 20',
      email: 'user20@test.com',
      createdAt: new Date(),
    };
  }

  @Mutation({
    input: z.object({ name: z.string(), email: z.string() }),
    output: user20Schema,
  })
  createUser20(name: string, email: string) {
    return { id: 'new-20', name, email, createdAt: new Date() };
  }

  @Query({
    input: z.object({ search: z.string().optional() }),
    output: z.array(user20Schema),
  })
  listUsers20(search?: string) {
    return [];
  }
}
