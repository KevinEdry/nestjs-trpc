import { initTRPC } from "@trpc/server";
import { z } from "zod";

const t = initTRPC.create();
const publicProcedure = t.procedure;

const appRouter = t.router({
  userRouter: {
    authors: publicProcedure.input(z.string()).output(z.array(z.object(
      {
        a: z.string(),
        b: z.object({
          bla: z.array(z.object({
            yaya: z.string(),
          }))
        }),
      }
    ))).query(async () => "PLACEHOLDER_DO_NOT_REMOVE" as any)
  }
});
export type AppRouter = typeof appRouter;

