import { Router, Query } from 'nestjs-trpc';
import { z } from 'zod';

@Router({ alias: 'items' })
export class ItemsRouter {
    @Query({
        input: z.object({ id: z.string() }),
    })
    getItem(id: string) {
        return { id, name: 'Item' };
    }
}
