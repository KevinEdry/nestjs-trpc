import { z } from 'zod';

const innerSchema = z.array(z.string());

export const userSchema = z.object({
  name: z.string(),
  password: innerSchema,
});
