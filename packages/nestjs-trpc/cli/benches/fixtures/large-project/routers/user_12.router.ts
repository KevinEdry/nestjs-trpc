import { Router, Query, Mutation } from 'nestjs-trpc';
import { z } from 'zod';

const user12Schema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  createdAt: z.date(),
});

@Router({ alias: 'users12' })
export class User12Router {
  @Query({
    input: z.object({ id: z.string() }),
    output: user12Schema,
  })
  getUser12(id: string) {
    return {
      id,
      name: 'User 12',
      email: 'user12@test.com',
      createdAt: new Date(),
    };
  }

  @Mutation({
    input: z.object({ name: z.string(), email: z.string() }),
    output: user12Schema,
  })
  createUser12(name: string, email: string) {
    return { id: 'new-12', name, email, createdAt: new Date() };
  }

  @Query({
    input: z.object({ search: z.string().optional() }),
    output: z.array(user12Schema),
  })
  listUsers12(search?: string) {
    return [];
  }
}
