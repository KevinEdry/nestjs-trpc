import { Router, Query, Mutation } from 'nestjs-trpc';
import { z } from 'zod';

const user22Schema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  createdAt: z.date(),
});

@Router({ alias: 'users22' })
export class User22Router {
  @Query({
    input: z.object({ id: z.string() }),
    output: user22Schema,
  })
  getUser22(id: string) {
    return {
      id,
      name: 'User 22',
      email: 'user22@test.com',
      createdAt: new Date(),
    };
  }

  @Mutation({
    input: z.object({ name: z.string(), email: z.string() }),
    output: user22Schema,
  })
  createUser22(name: string, email: string) {
    return { id: 'new-22', name, email, createdAt: new Date() };
  }

  @Query({
    input: z.object({ search: z.string().optional() }),
    output: z.array(user22Schema),
  })
  listUsers22(search?: string) {
    return [];
  }
}
