import { z } from 'zod';

export function createPaginatedResponseSchema<ItemType extends z.ZodTypeAny>(
  itemSchema: ItemType,
) {
  return z.object({
    pageIndex: z.number(),
    pageSize: z.number(),
    totalCount: z.number(),
    totalPages: z.number(),
    items: z.array(itemSchema),
  });
}

export const userSchema = z.object({
  name: z.string(),
  email: z.string(),
  password: z.string(),
});

export type User = z.infer<typeof userSchema>;
