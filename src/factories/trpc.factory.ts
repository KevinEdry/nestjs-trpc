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
import { TRPCContext, TRPCMiddleware } from '../interfaces';
import type { Class } from 'type-fest';

@Injectable()
export class TRPCFactory {
  constructor(
    private readonly trpcGenerator: TRPCGenerator,
    @Inject(RouterFactory) private readonly routerFactory: RouterFactory,
    @Inject(ProcedureFactory)
    private readonly procedureFactory: ProcedureFactory,
  ) {}

  serializeAppRoutes(
    router: TRPCRouter,
    procedure: TRPCPublicProcedure,
  ): MergeRouters<Array<AnyRouter>, AnyRouterDef> {
    const routerSchema = this.routerFactory.serializeRoutes(router, procedure);
    return router(routerSchema);
  }

  // TODO - move this functionality to the generator service
  async generateSchemaFile(outputFilePath: string): Promise<void> {
    const routers = this.routerFactory.getRouters();
    const mappedRoutesAndProcedures = routers.map((route) => {
      const { instance, name, alias } = route;
      const prototype = Object.getPrototypeOf(instance);
      const procedures = this.procedureFactory.getProcedures(
        instance,
        prototype,
      );

      return { name, alias, instance: { ...route }, procedures };
    });

    await this.trpcGenerator.generateSchemaFile(
      mappedRoutesAndProcedures,
      outputFilePath,
    );
  }

  // TODO - move this functionality to the generator service
  getMiddlewares(): Array<Class<TRPCMiddleware>> {
    const routers = this.routerFactory.getRouters();

    const middlewares = routers.flatMap((route) => {
      const { instance } = route;
      const prototype = Object.getPrototypeOf(instance);
      const procedures = this.procedureFactory.getProcedures(
        instance,
        prototype,
      );

      return procedures.flatMap((procedure) => procedure.middlewares);
    });

    // Returns a unique middleware array since we need to generate types only one time.
    return [...new Set(middlewares)];
  }

  // TODO - move this functionality to the generator service
  async generateHelperFile(
    outputFilePath: string,
    context?: Class<TRPCContext>,
  ): Promise<void> {
    const resources = {
      middlewares: this.getMiddlewares(),
      context,
    };

    await this.trpcGenerator.generateHelpersFile(resources);
  }
}
