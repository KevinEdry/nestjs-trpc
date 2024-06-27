import { initTRPC } from "@trpc/server";
import { z } from "zod";

const t = initTRPC.create();
const publicProcedure = t.procedure;
