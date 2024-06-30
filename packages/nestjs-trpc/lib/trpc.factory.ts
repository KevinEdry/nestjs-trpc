import { ConsoleLogger, Inject, Injectable } from '@nestjs/common';
import { MetadataScanner, ModulesContainer } from '@nestjs/core';
import { InstanceWrapper } from '@nestjs/core/injector/instance-wrapper';
import { PROCEDURE_KEY, PROCEDURE_METADATA_KEY, PROCEDURE_TYPE_KEY, ROUTER_METADATA_KEY } from './trpc.constants';

import { AnyRouter } from '@trpc/server';
import { MergeRouters } from '@trpc/server/dist/core/internals/mergeRouters';
import { AnyRouterDef } from '@trpc/server/dist/core/router';
import {
  ProcedureFactoryMetadata,
  RouterInstance,
  TRPCPublicProcedure,
  TRPCRouter,
} from './interfaces/factory.interface';
import { TRPCGenerator } from './trpc.generator';
import { camelCase, upperCase } from 'lodash';

@Injectable()
export class TRPCFactory {
  constructor(
    @Inject(TRPCGenerator) private readonly trpcGenerator: TRPCGenerator,
    @Inject(ConsoleLogger) private readonly consoleLogger: ConsoleLogger,
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

  private getProcedures(instance: unknown, prototype: object): Array<ProcedureFactoryMetadata> {
    return this.metadataScanner.scanFromPrototype(
      instance,
      prototype,
      (name) => {
        const callback = prototype[name];
        const type = Reflect.getMetadata(PROCEDURE_TYPE_KEY, callback);
        const metadata = Reflect.getMetadata(PROCEDURE_METADATA_KEY, callback);
        const customProcedure = Reflect.getMetadata(PROCEDURE_KEY, callback)

        console.log({customProcedure})

        return {
          input: metadata?.input,
          output: metadata?.output,
          type,
          name: callback.name,
          implementation: callback,
        };
      },
    );
  }



  generateRoutes(
    router: TRPCRouter,
    publicProcedure: TRPCPublicProcedure,
  ): MergeRouters<Array<AnyRouter>, AnyRouterDef> {
    const routers = this.getRouters();
    const routerSchema = routers.reduce((appRouterObj, route) => {
      const { instance, name } = route;
      const camelCasedRouterName = camelCase(name);
      const prototype = Object.getPrototypeOf(instance);
      const procedures = this.getProcedures(instance, prototype);

      this.consoleLogger.log(`Router ${name} as ${camelCasedRouterName}.`, "TRPC Factory");

      for (const producer of procedures) {
        const { input, output, type } = producer;
        const procedureInvocation = ({ input, ctx }) =>
          // Call the method on the instance with proper dependency injection handling.
          instance[producer.name]({ input, ctx });

        const baseProcedure = publicProcedure;
        const procedureWithInput = input
          ? baseProcedure.input(input)
          : baseProcedure;
        const procedureWithOutput = output
          ? baseProcedure.output(output)
          : procedureWithInput;
        const finalProcedure =
          type === 'mutation'
            ? procedureWithOutput.mutation(procedureInvocation)
            : procedureWithOutput.query(procedureInvocation);

        if (appRouterObj[camelCasedRouterName] == null) {
          appRouterObj[camelCasedRouterName] = {};
        }

        appRouterObj[camelCasedRouterName][producer.name] = finalProcedure;

        this.consoleLogger.log(`Mapped {${type}, ${camelCasedRouterName}.${producer.name}} route.`, "TRPC Factory");
      }

      return appRouterObj;
    }, {});

    return router(routerSchema);
  }

  async generateAppRouter(outputFilePath: string): Promise<void> {
    const routers = this.getRouters();
    const mappedRoutesAndProcedures = routers.map((route) => {
      const { instance, name } = route;
      const prototype = Object.getPrototypeOf(instance);
      const procedures = this.getProcedures(instance, prototype);

      return { name, instance: { ...route }, procedures };
    });

    await this.trpcGenerator.generate(
      mappedRoutesAndProcedures,
      outputFilePath,
    );
  }
}
