import { Router, Query, Mutation } from 'nestjs-trpc';
import { z } from 'zod';

const postSchema = z.object({
    id: z.string(),
    title: z.string(),
    authorId: z.string(),
});

const createPostInput = z.object({
    title: z.string().min(1).max(100),
    authorId: z.string().uuid(),
});

@Router({ alias: 'posts' })
export class PostsRouter {
    @Query({ input: z.object({ id: z.string() }), output: postSchema })
    getPost() {
        return { id: '1', title: 'Test', authorId: '1' };
    }

    @Mutation({ input: createPostInput, output: postSchema })
    createPost() {
        return { id: '2', title: 'New', authorId: '1' };
    }
}
