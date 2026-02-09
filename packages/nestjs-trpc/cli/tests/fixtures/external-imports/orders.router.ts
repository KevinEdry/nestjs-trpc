import { Router, Query, Mutation } from 'nestjs-trpc';
import { z } from 'zod';
import { orderSchema } from 'shared-schemas';
import { paymentSchema } from '@myorg/payment-types';

@Router({ alias: 'orders' })
export class OrdersRouter {
    @Query({
        input: z.object({ id: z.string() }),
        output: orderSchema,
    })
    getOrder() {
        return {} as any;
    }

    @Mutation({
        input: paymentSchema,
    })
    processPayment() {
        return {} as any;
    }
}
