import { Injectable } from '@nestjs/common';
import { RouterFactory } from './router.factory';
import { TRPCRouter } from '../interfaces/factory.interface';
import { AnyRouter, TRPCProcedureBuilder } from '@trpc/server';

@Injectable()
export class TRPCFactory {
  constructor(private readonly routerFactory: RouterFactory) {}

  serializeAppRoutes(
    router: TRPCRouter,
    procedure: TRPCProcedureBuilder<any, any, any, any, any, any, any, any>,
  ): AnyRouter {
    const routerSchema = this.routerFactory.serializeRoutes(router, procedure);
    return router(routerSchema);
  }
}
