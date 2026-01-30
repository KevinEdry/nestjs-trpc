import { Router, Query } from 'nestjs-trpc';
import { z } from 'zod';

@Router()
export class MalformedRouter {
    @Query({
        input: z.object({ userId: z.string()
        // Missing closing braces for z.object
    })
    getUser() {
        return { name: 'test' };
    }
}
