import { Inject, Injectable } from '@nestjs/common';
import { MergeRouters } from '@trpc/server/dist/core/internals/mergeRouters';
import { AnyRouterDef } from '@trpc/server/dist/core/router';
import { TRPCGenerator } from '../trpc.generator';
import { RouterFactory } from './router.factory';
import {
  TRPCPublicProcedure,
  TRPCRouter,
} from '../interfaces/factory.interface';
import { AnyRouter } from '@trpc/server';
import { ProcedureFactory } from './procedure.factory';

@Injectable()
export class TRPCFactory {
  constructor(
    private readonly trpcGenerator: TRPCGenerator,
    @Inject(RouterFactory) private readonly routerFactory: RouterFactory,
    @Inject(ProcedureFactory) private readonly procedureFactory: ProcedureFactory,
  ) {}

  serializeAppRoutes(
    router: TRPCRouter,
    procedure: TRPCPublicProcedure,
  ): MergeRouters<Array<AnyRouter>, AnyRouterDef> {
    const routerSchema = this.routerFactory.serializeRoutes(router, procedure);
    return router(routerSchema);
  }

  async generateSchemaFiles(outputFilePath: string): Promise<void> {
    const routers = this.routerFactory.getRouters();
    const mappedRoutesAndProcedures = routers.map((route) => {
      const { instance, name } = route;
      const prototype = Object.getPrototypeOf(instance);
      const procedures = this.procedureFactory.getProcedures(instance, prototype);

      return { name, instance: { ...route }, procedures };
    });

    await this.trpcGenerator.generate(
      mappedRoutesAndProcedures,
      outputFilePath,
    );
  }
}