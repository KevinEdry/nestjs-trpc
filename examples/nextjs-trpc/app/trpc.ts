import { createTRPCClient, httpBatchLink } from '@trpc/client';
import { AppRouter } from '@server/@generated/server';

export const trpc = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: `${process.env.NEXT_PUBLIC_NESTJS_SERVER}/trpc`,
    }),
  ],
});
