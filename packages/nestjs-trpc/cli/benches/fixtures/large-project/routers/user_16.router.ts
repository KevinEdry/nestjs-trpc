import { Router, Query, Mutation } from 'nestjs-trpc';
import { z } from 'zod';

const user16Schema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  createdAt: z.date(),
});

@Router({ alias: 'users16' })
export class User16Router {
  @Query({
    input: z.object({ id: z.string() }),
    output: user16Schema,
  })
  getUser16(id: string) {
    return {
      id,
      name: 'User 16',
      email: 'user16@test.com',
      createdAt: new Date(),
    };
  }

  @Mutation({
    input: z.object({ name: z.string(), email: z.string() }),
    output: user16Schema,
  })
  createUser16(name: string, email: string) {
    return { id: 'new-16', name, email, createdAt: new Date() };
  }

  @Query({
    input: z.object({ search: z.string().optional() }),
    output: z.array(user16Schema),
  })
  listUsers16(search?: string) {
    return [];
  }
}
