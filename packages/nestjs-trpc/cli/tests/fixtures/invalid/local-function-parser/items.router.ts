import { Router, Query } from 'nestjs-trpc';
import { z } from 'zod';

function localParser<T>(schema: { parse: (value: unknown) => T }) {
  return (value: unknown): T => schema.parse(value);
}

@Router({ alias: 'items' })
export class ItemsRouter {
    @Query({
        input: localParser(z.object({ id: z.string() })),
    })
    getItem() {
        return {} as any;
    }
}
