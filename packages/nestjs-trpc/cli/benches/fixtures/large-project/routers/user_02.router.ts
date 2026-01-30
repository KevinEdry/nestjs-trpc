import { Router, Query, Mutation } from 'nestjs-trpc';
import { z } from 'zod';

const user02Schema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  createdAt: z.date(),
});

@Router({ alias: 'users02' })
export class User02Router {
  @Query({
    input: z.object({ id: z.string() }),
    output: user02Schema,
  })
  getUser02(id: string) {
    return {
      id,
      name: 'User 02',
      email: 'user02@test.com',
      createdAt: new Date(),
    };
  }

  @Mutation({
    input: z.object({ name: z.string(), email: z.string() }),
    output: user02Schema,
  })
  createUser02(name: string, email: string) {
    return { id: 'new-02', name, email, createdAt: new Date() };
  }

  @Query({
    input: z.object({ search: z.string().optional() }),
    output: z.array(user02Schema),
  })
  listUsers02(search?: string) {
    return [];
  }
}
