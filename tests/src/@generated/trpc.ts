import { initTRPC } from "@trpc/server";
import { z } from "zod";

const t = initTRPC.create();
const publicProcedure = t.procedure;

const appRouter = t.router({
  UserRouter: {
    authors: publicProcedure
      .input(undefined)
      .output([object Object])
      .query(authors() {
        return this.userService.test();
      }),
    createAuthor: publicProcedure
      .input([object Object])
      .output([object Object])
      .mutation(createAuthor(input) {
        return 'bla';
      })
  }
});
export type AppRouter = typeof appRouter;

