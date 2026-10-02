import { Router, Query } from 'nestjs-trpc';

function localParser(value: unknown) {
  return value;
}

@Router({ alias: 'items' })
export class ItemsRouter {
    @Query({ input: localParser })
    getItem() {
        return {} as any;
    }
}
