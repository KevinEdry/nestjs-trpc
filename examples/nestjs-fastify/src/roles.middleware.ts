import {
  MiddlewareOptions,
  MiddlewareResponse,
  TRPCMiddleware,
} from 'nestjs-trpc';
import { Injectable } from '@nestjs/common';
import { TRPCError } from '@trpc/server';

export interface RolesMeta {
  roles: string[];
}

interface AuthContext {
  auth: {
    user: string;
  };
}

@Injectable()
export class RolesMiddleware implements TRPCMiddleware<RolesMeta> {
  async use(
    opts: MiddlewareOptions<AuthContext, Record<string, unknown>, RolesMeta>,
  ): Promise<MiddlewareResponse> {
    const { meta, ctx, next } = opts;

    if (!meta.roles.includes(ctx.auth.user)) {
      throw new TRPCError({
        message: 'Insufficient permissions.',
        code: 'FORBIDDEN',
      });
    }

    return next();
  }
}
