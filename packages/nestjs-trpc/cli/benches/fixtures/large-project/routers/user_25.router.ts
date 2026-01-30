import { Router, Query, Mutation } from 'nestjs-trpc';
import { z } from 'zod';

const user25Schema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  createdAt: z.date(),
});

@Router({ alias: 'users25' })
export class User25Router {
  @Query({
    input: z.object({ id: z.string() }),
    output: user25Schema,
  })
  getUser25(id: string) {
    return {
      id,
      name: 'User 25',
      email: 'user25@test.com',
      createdAt: new Date(),
    };
  }

  @Mutation({
    input: z.object({ name: z.string(), email: z.string() }),
    output: user25Schema,
  })
  createUser25(name: string, email: string) {
    return { id: 'new-25', name, email, createdAt: new Date() };
  }

  @Query({
    input: z.object({ search: z.string().optional() }),
    output: z.array(user25Schema),
  })
  listUsers25(search?: string) {
    return [];
  }
}
