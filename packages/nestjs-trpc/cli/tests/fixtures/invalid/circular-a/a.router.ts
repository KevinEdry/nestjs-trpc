import { Router, Query } from 'nestjs-trpc';
import { bSchema } from '../circular-b/b.router';

@Router({ alias: 'a' })
export class ARouter {
    @Query({ input: bSchema })
    getA() {
        return { a: 'value' };
    }
}

export const aSchema = { type: 'a' };
