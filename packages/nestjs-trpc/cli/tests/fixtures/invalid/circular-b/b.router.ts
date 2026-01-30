import { Router, Query } from 'nestjs-trpc';
import { aSchema } from '../circular-a/a.router';

@Router({ alias: 'b' })
export class BRouter {
    @Query({ input: aSchema })
    getB() {
        return { b: 'value' };
    }
}

export const bSchema = { type: 'b' };
