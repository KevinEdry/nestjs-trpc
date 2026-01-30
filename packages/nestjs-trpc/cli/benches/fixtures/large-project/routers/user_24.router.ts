import { Router, Query, Mutation } from 'nestjs-trpc';
import { z } from 'zod';

const user24Schema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  createdAt: z.date(),
});

@Router({ alias: 'users24' })
export class User24Router {
  @Query({
    input: z.object({ id: z.string() }),
    output: user24Schema,
  })
  getUser24(id: string) {
    return {
      id,
      name: 'User 24',
      email: 'user24@test.com',
      createdAt: new Date(),
    };
  }

  @Mutation({
    input: z.object({ name: z.string(), email: z.string() }),
    output: user24Schema,
  })
  createUser24(name: string, email: string) {
    return { id: 'new-24', name, email, createdAt: new Date() };
  }

  @Query({
    input: z.object({ search: z.string().optional() }),
    output: z.array(user24Schema),
  })
  listUsers24(search?: string) {
    return [];
  }
}
