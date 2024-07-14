import { Inject, Injectable } from '@nestjs/common';
import { MergeRouters } from '@trpc/server/dist/core/internals/mergeRouters';
import { AnyRouterDef } from '@trpc/server/dist/core/router';
import { TRPCGenerator } from '../generators/trpc.generator';
import { RouterFactory } from './router.factory';
import {
  TRPCPublicProcedure,
  TRPCRouter,
} from '../interfaces/factory.interface';
import { AnyRouter, ProcedureBuilder, ProcedureParams } from '@trpc/server';
import { ProcedureFactory } from './procedure.factory';
import { TRPCContext, TRPCMiddleware } from '../interfaces';
import type { Class } from 'type-fest';

@Injectable()
export class TRPCFactory {
  @Inject(TRPCGenerator)
  private readonly trpcGenerator!: TRPCGenerator;
  
  @Inject(RouterFactory) 
  private readonly routerFactory!: RouterFactory;

  @Inject(ProcedureFactory)
  private readonly procedureFactory!: ProcedureFactory;

  serializeAppRoutes(
    router: TRPCRouter,
    procedure: ProcedureBuilder<any>,
  ): MergeRouters<Array<AnyRouter>, AnyRouterDef> {
    const routerSchema = this.routerFactory.serializeRoutes(router, procedure);
    return router(routerSchema);
  }
}
