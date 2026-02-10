import { Router, Query, Mutation } from 'nestjs-trpc';
import { z } from 'zod';

export const addressSchema = z.object({
    street: z.string(),
    city: z.string(),
    zip: z.string().regex(/^\d{5}$/),
});

const customerSchema = z.object({
    id: z.string().uuid(),
    email: z.string().email(),
    name: z.string().min(2).max(50),
    addresses: z.array(addressSchema),
    status: z.enum(['active', 'inactive', 'pending']),
    metadata: z.record(z.string(), z.unknown()).optional(),
});

const paginationInput = z.object({
    page: z.number().int().positive().default(1),
    limit: z.number().int().min(1).max(100).default(20),
});

const filterSchema = z.object({
    status: z.enum(['active', 'inactive', 'pending']),
    query: z.string().optional(),
});

@Router({ alias: 'customers' })
export class CustomersRouter {
    @Query({
        input: paginationInput,
        output: z.object({
            items: z.array(customerSchema),
            total: z.number(),
            page: z.number(),
        }),
    })
    list() {
        return { items: [], total: 0, page: 1 };
    }

    @Mutation({
        input: customerSchema.omit({ id: true }),
        output: customerSchema,
    })
    create() {
        return {} as any;
    }

    @Query({
        input: z.object({ id: z.string().uuid() }),
        output: customerSchema.nullable(),
    })
    getById() {
        return null;
    }

    @Query({
        input: paginationInput.merge(filterSchema),
        output: z.array(customerSchema),
    })
    search() {
        return [];
    }
}
