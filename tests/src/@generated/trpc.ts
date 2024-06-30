import { initTRPC } from "@trpc/server";
import { z } from "zod";

const t = initTRPC.create();
const publicProcedure = t.procedure;

const appRouter = t.router({
  userRouter: {
    authors: publicProcedure.input(z.union([z.object({
      linoy: z.array(z.object({
        bla: z.string(),
      })),
      magniva: z.object({
        placeholder: z.enum(['bla']),
      }),
    }), z.object({
      name: z.string(),
      password: z.array(z.string()),
    })])).mutation(async () => "PLACEHOLDER_DO_NOT_REMOVE" as any)
  }
});
export type AppRouter = typeof appRouter;

