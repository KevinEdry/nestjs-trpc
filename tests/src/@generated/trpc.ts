import { initTRPC } from "@trpc/server";
import { z } from "zod";

const t = initTRPC.create();
const publicProcedure = t.procedure;

const appRouter = t.router({
  userRouter: {
    authors: publicProcedure.output(z.object({ bla: z.string() })).query(async () => "PLACEHOLDER_DO_NOT_REMOVE" as any),
    createAuthor: publicProcedure.input(z.number()).output(z.object({
      linoy: z.string(),
      magniva: z.object({
        placeholder: z.enum(['bla']),
      }),
    })).mutation(async () => "PLACEHOLDER_DO_NOT_REMOVE" as any)
  },
  testRouter: {
    authors: publicProcedure.output(z.object({ bla: z.string() })).query(async () => "PLACEHOLDER_DO_NOT_REMOVE" as any),
    createAuthor: publicProcedure.input(z.number()).output(z.object({
      linoy: z.string(),
      magniva: z.object({
        placeholder: z.enum(['bla']),
      }),
    })).mutation(async () => "PLACEHOLDER_DO_NOT_REMOVE" as any)
  }
});
export type AppRouter = typeof appRouter;

