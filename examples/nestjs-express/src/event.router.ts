import { Router, Subscription, Input, Options } from 'nestjs-trpc';
import { z } from 'zod';

@Router({ alias: 'events' })
export class EventRouter {
  @Subscription({
    input: z.object({ channelId: z.string() }),
  })
  async *onMessage(
    @Input('channelId') channelId: string,
    @Options() opts: { signal?: AbortSignal },
  ) {
    for (let i = 0; i < 5; i++) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      yield {
        message: `Message ${i} on channel ${channelId}`,
        timestamp: Date.now(),
      };
    }
  }
}
