import { Mutation, Query, Router } from 'nestjs-trpc';
import { z } from 'zod';

@Router({ alias: 'typed' })
export class TypedRouter {
    @Query({
        input: z.object({ id: z.string() }),
    })
    getUser(): { id: string; role: 'admin' } {
        return { id: 'user-1', role: 'admin' };
    }

    @Mutation({
        input: z.object({ name: z.string() }),
    })
    async createItem(): Promise<{ ok: true; count: number }> {
        return { ok: true, count: 1 };
    }
}
