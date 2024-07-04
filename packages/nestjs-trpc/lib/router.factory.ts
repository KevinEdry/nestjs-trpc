import { ConsoleLogger, Injectable } from '@nestjs/common';
import { MetadataScanner, ModuleRef, ModulesContainer } from '@nestjs/core';
import { InstanceWrapper } from '@nestjs/core/injector/instance-wrapper';
import { camelCase } from 'lodash';
import { PROCEDURE_KEY, PROCEDURE_METADATA_KEY, PROCEDURE_TYPE_KEY, ROUTER_METADATA_KEY } from './trpc.constants';
import {
  ProcedureFactoryMetadata,
  RouterInstance,
  TRPCPublicProcedure,
  TRPCRouter,
} from './interfaces/factory.interface';
import { TRPCProcedure } from './interfaces';

@Injectable()
export class RouterFactory {
  constructor(
    private readonly consoleLogger: ConsoleLogger,
    private readonly modulesContainer: ModulesContainer,
    private readonly metadataScanner: MetadataScanner,
    private readonly moduleRef: ModuleRef
  ) {}

  getRouters(): Array<RouterInstance> {
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
        const routeProcedureDef: TRPCProcedure = Reflect.getMetadata(
          PROCEDURE_KEY,
          instance.constructor,
        );

        if (router != null) {
          routers.push({ name, instance, options: router, routeProcedureDef });
        }
      });
    });

    return routers;
  }

  getProcedures(
    instance: unknown,
    prototype: object,
  ): Array<ProcedureFactoryMetadata> {
    return this.metadataScanner.scanFromPrototype(
      instance,
      prototype,
      (name) => {
        const callback = prototype[name];
        const type = Reflect.getMetadata(PROCEDURE_TYPE_KEY, callback);
        const metadata = Reflect.getMetadata(PROCEDURE_METADATA_KEY, callback);
        const procedureDef: TRPCProcedure = Reflect.getMetadata(
          PROCEDURE_KEY,
          callback,
        );

        return {
          input: metadata?.input,
          output: metadata?.output,
          procedureDef,
          type,
          name: callback.name,
          implementation: callback,
        };
      },
    );
  }


  serializeProcedures(
    procedures: Array<ProcedureFactoryMetadata>,
    instance: any,
    camelCasedRouterName: string,
    procedure: TRPCPublicProcedure,
    routeProcedureDef: TRPCProcedure
  ): Record<string, any> {
    const serializedProcedures = {};

    for (const producer of procedures) {
      const { input, output, type, procedureDef, name } = producer;

      let procedureInstance: TRPCPublicProcedure;
      if (typeof procedureDef === "function") {
        const customProcedureInstance = this.moduleRef.get<TRPCProcedure>(procedureDef, { strict: false });
        // @ts-ignore
        procedureInstance = procedure.use((opts) => customProcedureInstance.use(opts));
      } else if (typeof routeProcedureDef === "function") {
        const customProcedureInstance = this.moduleRef.get<TRPCProcedure>(routeProcedureDef, { strict: false });
        // @ts-ignore
        procedureInstance = procedure.use((opts) => customProcedureInstance.use(opts));
      } else {
        procedureInstance = procedure;
      }

      const procedureInvocation = ({ input, ctx, meta }) =>
        instance[name]({ input, ctx, meta });

      const baseProcedure = procedureInstance;
      const procedureWithInput = input
        ? baseProcedure.input(input)
        : baseProcedure;
      const procedureWithOutput = output
        ? procedureWithInput.output(output)
        : procedureWithInput;
      serializedProcedures[name] = type === 'mutation'
        ? procedureWithOutput.mutation(procedureInvocation)
        : procedureWithOutput.query(procedureInvocation);


      this.consoleLogger.log(
        `Mapped {${type}, ${camelCasedRouterName}.${name}} route.`,
        'Router Factory',
      );
    }

    return serializedProcedures;
  }

  serializeRoutes(
    router: TRPCRouter,
    procedure: TRPCPublicProcedure
  ): Record<string, any> {
    const routers = this.getRouters();
    const routerSchema = {};

    routers.map( route => {
      const { instance, name, routeProcedureDef } = route;
      const camelCasedRouterName = camelCase(name);
      const prototype = Object.getPrototypeOf(instance);

      const procedures = this.getProcedures(instance, prototype);

      this.consoleLogger.log(
        `Router ${name} as ${camelCasedRouterName}.`,
        'Router Factory',
      );

      routerSchema[camelCasedRouterName] = this.serializeProcedures(
        procedures,
        instance,
        camelCasedRouterName,
        procedure,
        routeProcedureDef
      );
    });

    return routerSchema;
  }
}