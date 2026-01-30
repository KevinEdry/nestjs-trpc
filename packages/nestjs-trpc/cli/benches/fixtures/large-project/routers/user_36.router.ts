import { Router, Query, Mutation } from 'nestjs-trpc';
import { z } from 'zod';

const user36Schema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  createdAt: z.date(),
});

@Router({ alias: 'users36' })
export class User36Router {
  @Query({
    input: z.object({ id: z.string() }),
    output: user36Schema,
  })
  getUser36(id: string) {
    return {
      id,
      name: 'User 36',
      email: 'user36@test.com',
      createdAt: new Date(),
    };
  }

  @Mutation({
    input: z.object({ name: z.string(), email: z.string() }),
    output: user36Schema,
  })
  createUser36(name: string, email: string) {
    return { id: 'new-36', name, email, createdAt: new Date() };
  }

  @Query({
    input: z.object({ search: z.string().optional() }),
    output: z.array(user36Schema),
  })
  listUsers36(search?: string) {
    return [];
  }
}
