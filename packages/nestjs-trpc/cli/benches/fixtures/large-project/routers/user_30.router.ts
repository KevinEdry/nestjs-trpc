import { Router, Query, Mutation } from 'nestjs-trpc';
import { z } from 'zod';

const user30Schema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  createdAt: z.date(),
});

@Router({ alias: 'users30' })
export class User30Router {
  @Query({
    input: z.object({ id: z.string() }),
    output: user30Schema,
  })
  getUser30(id: string) {
    return {
      id,
      name: 'User 30',
      email: 'user30@test.com',
      createdAt: new Date(),
    };
  }

  @Mutation({
    input: z.object({ name: z.string(), email: z.string() }),
    output: user30Schema,
  })
  createUser30(name: string, email: string) {
    return { id: 'new-30', name, email, createdAt: new Date() };
  }

  @Query({
    input: z.object({ search: z.string().optional() }),
    output: z.array(user30Schema),
  })
  listUsers30(search?: string) {
    return [];
  }
}
