import { Injectable } from '@nestjs/common';
import { ModulesContainer, MetadataScanner } from '@nestjs/core';
import { InstanceWrapper } from '@nestjs/core/injector/instance-wrapper';
import {
  PROCEDURE_METADATA_KEY,
  PROCEDURE_TYPE_KEY,
  ROUTER_METADATA_KEY,
} from './trpc.constants';

import { generateTRPCRoutes } from './generator';
import { AnyRouter } from '@trpc/server';
import { MergeRouters } from '@trpc/server/dist/core/internals/mergeRouters';
import { AnyRouterDef } from '@trpc/server/dist/core/router';
import {
  RoutersMetadata,
  ProcedureInstance,
  TRPCRouter,
  TRPCMergeRoutes,
  TRPCPublicProcedure,
  RouterInstance,
} from './interfaces/factory.interface';

@Injectable()
export class TrpcFactory {
  constructor(
    private readonly modulesContainer: ModulesContainer,
    private readonly metadataScanner: MetadataScanner,
  ) {}

  private getRouters(): Array<RouterInstance> {
    const routers = [];
    this.modulesContainer.forEach((moduleRef) => {
      moduleRef.providers.forEach((wrapper: InstanceWrapper) => {
        const { instance, name } = wrapper;
        if (!instance) {
          return undefined;
        }

        const router = Reflect.getMetadata(
          ROUTER_METADATA_KEY,
          instance.constructor,
        );

        if (router != null) {
          routers.push({ name, instance, options: router });
        }
      });
    });

    return routers;
  }

  private getProcedures(instance, prototype): Array<ProcedureInstance> {
    const procedures = this.metadataScanner.scanFromPrototype(
      instance,
      prototype,
      (name) => {
        const callback = prototype[name];
        const type = Reflect.getMetadata(PROCEDURE_TYPE_KEY, callback);
        const { input, output } = Reflect.getMetadata(
          PROCEDURE_METADATA_KEY,
          callback,
        );

        return {
          type,
          input,
          name: callback.name,
          output,
          implementation: callback,
        };
      },
    );

    return procedures;
  }

  generateRoutes(
    router: TRPCRouter,
    mergeRoutes: TRPCMergeRoutes,
    publicProcedure: TRPCPublicProcedure,
  ): MergeRouters<Array<AnyRouter>, AnyRouterDef> {
    const routers = this.getRouters();
    const routerSchema = routers.map((route) => {
      const { instance, name } = route;
      const prototype = Object.getPrototypeOf(instance);
      const procedures = this.getProcedures(instance, prototype);

      const producersSchema = procedures.reduce(
        (obj, producer) => {
          //TODO: distinguish between queries and mutations.
          //TODO: add input and outputs check
          //TODO: distinguish between public, shielded and protected procedures.
          obj[name.toLowerCase()][producer.name] = publicProcedure.query(
            ({ input }) =>
              // Call the method on the instance with proper dependency injection handling
              instance[producer.name](input),
          );
          return obj;
        },
        {
          [name.toLowerCase()]: {},
        },
      );

      return router(producersSchema);
    });

    console.log(routerSchema);
    return mergeRoutes(...routerSchema);
  }

  async generateAppRouter(outputFilePath: string): Promise<void> {
    const routers = this.getRouters();
    const mappedRoutesAndProcedures = routers.map((route) => {
      const { instance, name } = route;
      const prototype = Object.getPrototypeOf(instance);
      const procedures = this.getProcedures(instance, prototype);

      return { name, instance: { ...route }, procedures };
    });

    await generateTRPCRoutes(mappedRoutesAndProcedures, outputFilePath);
  }
}
