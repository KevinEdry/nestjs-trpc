import { initTRPC } from "@trpc/server";
import { z } from "zod";

const t = initTRPC.create();
const publicProcedure = t.procedure;

const appRouter = t.router({
  UserRouter: {
    authors: publicProcedure.output(z.string()).query(async () => "PLACEHOLDER_DO_NOT_REMOVE" as any),
    createAuthor: publicProcedure.input(z.string()).output(z.object({
      linoy: z.string(),
      kimhi: z.number(),
    })).mutation(async () => "PLACEHOLDER_DO_NOT_REMOVE" as any)
  }
});
export type AppRouter = typeof appRouter;

