import { z } from 'zod';

export const itemInputSchema = z.object({ id: z.string() });
export const itemSchema = z.object({ id: z.string(), name: z.string() });
