import { Router, Query, Mutation } from 'nestjs-trpc';
import { z } from 'zod';

@Router({ alias: 'items' })
export class ItemsRouter {
    @Query({
        input: z.object({ id: z.string() }),
        output: z.object({ id: z.string(), name: z.string() }),
    })
    getItem(id: string) {
        return { id, name: 'Item' };
    }

    @Mutation({
        input: z.object({ name: z.string() }),
    })
    createItem(name: string) {
        return { id: '1', name };
    }
}
