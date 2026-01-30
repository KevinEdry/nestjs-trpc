import { Router, Query } from 'nestjs-trpc';
import { z } from 'zod';
import { userSchema } from './user.schema';

@Router({ alias: 'users' })
export class UserRouter {
    @Query({
        input: z.object({ userId: z.string() }),
        output: userSchema,
    })
    getUser(userId: string) {
        return { id: userId, name: 'Test User' };
    }
}
