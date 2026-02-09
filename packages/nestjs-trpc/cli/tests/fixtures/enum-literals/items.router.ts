import { Router, Query, Mutation } from 'nestjs-trpc';
import { z } from 'zod';
import { TypeEnum, Status, Priority } from './types';

const itemSchema = z.object({
    id: z.string(),
    type: z.literal(TypeEnum.Normal),
    status: z.literal(Status.Active),
    priority: z.literal(Priority.High),
});

@Router({ alias: 'items' })
export class ItemsRouter {
    @Query({
        input: z.object({ id: z.string() }),
        output: itemSchema,
    })
    getItem() {
        return {} as any;
    }

    @Mutation({
        input: z.object({
            type: z.enum([TypeEnum.Normal, TypeEnum.Special]),
        }),
    })
    createItem() {
        return {} as any;
    }
}
