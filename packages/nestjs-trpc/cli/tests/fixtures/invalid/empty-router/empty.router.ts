import { Router } from 'nestjs-trpc';

@Router({ alias: 'empty' })
export class EmptyRouter {
    // No methods - this should still generate an empty router
}
