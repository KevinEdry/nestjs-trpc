import { Router, Query } from 'nestjs-trpc';
import { z } from 'zod';
import { itemSchema } from '@/schemas';

@Router({ alias: 'items' })
export class ItemsRouter {
    @Query({
        input: z.object({ id: z.string() }),
        output: itemSchema,
    })
    getItem() {
        return {} as any;
    }
}
