import { Injectable } from '@nestjs/common';
import { ModulesContainer, MetadataScanner } from '@nestjs/core';
import { InstanceWrapper } from '@nestjs/core/injector/instance-wrapper';
import { ZodSchema } from 'zod';
import {
  PROCEDURE_METADATA_KEY,
  PROCEDURE_TYPE_KEY,
  ROUTER_METADATA_KEY,
} from './trpc.constants';
import { Procedure } from './trpc.enum';

interface ProcedureMetadata {
  type: Procedure;
  input: ZodSchema | undefined;
  response: ZodSchema | undefined;
  name: string;
  implementation: ({ input }) => any;
}

@Injectable()
export class TrpcFactory {
  constructor(
    private readonly modulesContainer: ModulesContainer,
    private readonly metadataScanner: MetadataScanner,
  ) {}

  getRouters() {
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

  getProducers(instance, prototype): Array<ProcedureMetadata> {
    const producers = this.metadataScanner.scanFromPrototype(
      instance,
      prototype,
      (name) => {
        const callback = prototype[name];
        const type = Reflect.getMetadata(PROCEDURE_TYPE_KEY, callback);
        const { input, response } = Reflect.getMetadata(
          PROCEDURE_METADATA_KEY,
          callback,
        );

        return {
          type,
          input,
          name: callback.name,
          response,
          implementation: callback,
        };
      },
    );

    return producers;
  }

  generateSchema(router, publicProcedure): Record<string, any> {
    const routers = this.getRouters();
    const routerSchema = routers.reduce((objA, router) => {
      const { instance } = router;
      const prototype = Object.getPrototypeOf(instance);
      const producers = this.getProducers(instance, prototype);

      const producersSchema = producers.reduce((obj, producer) => {
        obj[producer.name] = publicProcedure
          .query()
          .fn(producer.implementation);
        return obj;
      }, {});

      objA[router.name] = producersSchema;
      return objA;
    }, {});

    console.log({ routerSchema });
    console.log({
      crafted: router({
        author: publicProcedure.query(() => {
          return 'bla';
        }),
      }),
    });
    return router(routerSchema);
  }
}
