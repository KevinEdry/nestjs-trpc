import { Router, Query, Mutation } from 'nestjs-trpc';
import { z } from 'zod';
import { parseId, syncParse, syncParseArrow } from './parsers';
import { itemInputSchema, itemSchema } from './item.schema';

export function strictParse<T>(schema: { parse: (value: unknown) => T }) {
  return (value: unknown): T => schema.parse(value);
}

function looseParse(value: unknown) {
  return value;
}

export { looseParse };

@Router({ alias: 'items' })
export class ItemsRouter {
    @Query({
        input: syncParse(itemInputSchema),
        output: syncParseArrow(itemSchema),
    })
    getItem() {
        return {} as any;
    }

    @Query({
        input: parseId,
    })
    getItemById() {
        return {} as any;
    }

    @Query({
        input: looseParse,
    })
    findItems() {
        return {} as any;
    }

    @Mutation({
        input: strictParse(z.object({ name: z.string() })),
    })
    createItem() {
        return {} as any;
    }
}
