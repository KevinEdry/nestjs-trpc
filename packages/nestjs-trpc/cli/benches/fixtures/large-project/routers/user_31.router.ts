import { Router, Query, Mutation } from 'nestjs-trpc';
import { z } from 'zod';

const user31Schema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  createdAt: z.date(),
});

@Router({ alias: 'users31' })
export class User31Router {
  @Query({
    input: z.object({ id: z.string() }),
    output: user31Schema,
  })
  getUser31(id: string) {
    return {
      id,
      name: 'User 31',
      email: 'user31@test.com',
      createdAt: new Date(),
    };
  }

  @Mutation({
    input: z.object({ name: z.string(), email: z.string() }),
    output: user31Schema,
  })
  createUser31(name: string, email: string) {
    return { id: 'new-31', name, email, createdAt: new Date() };
  }

  @Query({
    input: z.object({ search: z.string().optional() }),
    output: z.array(user31Schema),
  })
  listUsers31(search?: string) {
    return [];
  }
}
