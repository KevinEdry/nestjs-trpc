import { Router, Query } from 'nestjs-trpc';
import { z } from 'zod';

const localParser =
  <T,>(schema: { parse: (value: unknown) => T }) =>
  (value: unknown): T =>
    schema.parse(value);

@Router({ alias: 'items' })
export class ItemsRouter {
    @Query({
        input: localParser(z.object({ id: z.string() })),
    })
    getItem() {
        return {} as any;
    }
}
