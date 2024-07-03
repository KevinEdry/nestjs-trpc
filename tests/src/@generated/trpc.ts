import { initTRPC } from "@trpc/server";
import { z } from "zod";

const t = initTRPC.create();
const publicProcedure = t.procedure;

const appRouter = t.router({ userRouter: { authors: publicProcedure.query(async () => "PLACEHOLDER_DO_NOT_REMOVE" as any) } });
export type AppRouter = typeof appRouter;

