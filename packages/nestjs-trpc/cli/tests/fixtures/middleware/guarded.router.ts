import { Router, Query } from 'nestjs-trpc';
import { z } from 'zod';

@Router({ alias: 'admin' })
export class AdminRouter {
    @Query({ output: z.object({ secret: z.string() }) })
    getSecret() {
        return { secret: 'classified' };
    }
}
