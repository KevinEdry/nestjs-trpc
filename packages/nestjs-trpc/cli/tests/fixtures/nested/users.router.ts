import { Router, Query } from 'nestjs-trpc';
import { z } from 'zod';

const userSchema = z.object({
    id: z.string(),
    name: z.string(),
});

@Router({ alias: 'users' })
export class UsersRouter {
    @Query({ output: userSchema })
    getUser() {
        return { id: '1', name: 'Test' };
    }

    @Query({ output: z.array(userSchema) })
    listUsers() {
        return [];
    }
}
