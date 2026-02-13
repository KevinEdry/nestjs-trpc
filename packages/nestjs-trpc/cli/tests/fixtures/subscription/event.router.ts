import { Router, Query, Mutation, Subscription } from 'nestjs-trpc';
import { z } from 'zod';

const messageSchema = z.object({
    id: z.string().uuid(),
    text: z.string(),
    timestamp: z.number(),
});

@Router({ alias: 'events' })
export class EventRouter {
    @Query({
        output: z.array(messageSchema),
    })
    getHistory() {
        return [];
    }

    @Mutation({
        input: z.object({ text: z.string() }),
        output: messageSchema,
    })
    sendMessage() {
        return {} as any;
    }

    @Subscription({
        input: z.object({ channelId: z.string() }),
        output: messageSchema,
    })
    onMessage() {
        return {} as any;
    }

    @Subscription({
        output: z.object({ status: z.enum(['online', 'offline']) }),
    })
    onStatusChange() {
        return {} as any;
    }
}
