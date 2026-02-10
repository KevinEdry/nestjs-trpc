import { Router, Mutation } from 'nestjs-trpc';
import { z } from 'zod';

@Router({ alias: 'users' })
export class UserMutationsRouter {
    @Mutation({ input: z.object({ name: z.string() }), output: z.object({ id: z.string(), name: z.string() }) })
    createUser() {
        return { id: '2', name: 'New' };
    }

    @Mutation({ input: z.object({ id: z.string(), name: z.string() }), output: z.object({ id: z.string(), name: z.string() }) })
    updateUser() {
        return { id: '1', name: 'Updated' };
    }
}
