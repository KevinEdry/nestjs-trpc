import { Router, Query } from 'nestjs-trpc';

export function localParser(value: unknown) {
  return value;
}

@Router({ alias: 'other' })
export class OtherRouter {
    @Query()
    getOther() {
        return {} as any;
    }
}
