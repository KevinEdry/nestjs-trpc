import { Router, Query } from 'nestjs-trpc';
import { z } from 'zod';

@Router({ alias: 'posts' })
export class PostsRouter {
    @Query({ output: z.array(z.object({ id: z.string(), title: z.string() })) })
    listPosts() {
        return [];
    }
}
