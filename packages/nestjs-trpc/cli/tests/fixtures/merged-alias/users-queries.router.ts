import { Router, Query } from 'nestjs-trpc';
import { z } from 'zod';

@Router({ alias: 'users' })
export class UserQueriesRouter {
    @Query({ input: z.object({ id: z.string() }), output: z.object({ id: z.string(), name: z.string() }) })
    getUser() {
        return { id: '1', name: 'Test' };
    }

    @Query({ output: z.array(z.object({ id: z.string(), name: z.string() })) })
    listUsers() {
        return [];
    }
}
