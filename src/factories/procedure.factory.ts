import { ConsoleLogger, Injectable, Type } from '@nestjs/common';
import { MetadataScanner, ModuleRef } from '@nestjs/core';
import {
  PROCEDURE_METADATA_KEY,
  PROCEDURE_TYPE_KEY,
  MIDDLEWARE_KEY,
} from '../trpc.constants';
import {
  ProcedureFactoryMetadata,
  TRPCPublicProcedure,
} from '../interfaces/factory.interface';
import { TRPCMiddleware } from '../interfaces';

@Injectable()
export class ProcedureFactory {
  constructor(
    private readonly consoleLogger: ConsoleLogger,
    private readonly metadataScanner: MetadataScanner,
    private readonly moduleRef: ModuleRef,
  ) {}

  getProcedures(
    instance: unknown,
    prototype: object,
  ): Array<ProcedureFactoryMetadata> {
    return this.metadataScanner.scanFromPrototype(instance, prototype, (name) =>
      this.extractProcedureMetadata(name, prototype),
    );
  }

  private extractProcedureMetadata(
    name: string,
    prototype: object,
  ): ProcedureFactoryMetadata {
    const callback = prototype[name];
    const type = Reflect.getMetadata(PROCEDURE_TYPE_KEY, callback);
    const metadata = Reflect.getMetadata(PROCEDURE_METADATA_KEY, callback);
    const middlewares: TRPCMiddleware = Reflect.getMetadata(
      MIDDLEWARE_KEY,
      callback,
    );

    return {
      input: metadata?.input,
      output: metadata?.output,
      middlewares,
      type,
      name: callback.name,
      implementation: callback,
    };
  }

  serializeProcedures(
    procedures: Array<ProcedureFactoryMetadata>,
    instance: any,
    camelCasedRouterName: string,
    procedureBuilder: TRPCPublicProcedure,
    routerMiddlewares: TRPCMiddleware,
  ): Record<string, any> {
    const serializedProcedures = {};

    for (const procedure of procedures) {
      const { input, output, type, middlewares, name } = procedure;
      const procedureInstance = this.createProcedureInstance(
        procedureBuilder,
        middlewares,
        routerMiddlewares,
      );
      const routerInstance = this.moduleRef.get(instance.constructor, {
        strict: false,
      });

      serializedProcedures[name] = this.createSerializedProcedure(
        procedureInstance,
        name,
        input,
        output,
        type,
        routerInstance,
      );

      this.consoleLogger.log(
        `Mapped {${type}, ${camelCasedRouterName}.${name}} route.`,
        'Router Factory',
      );
    }

    return serializedProcedures;
  }

  private createProcedureInstance(
    procedureBuilder: TRPCPublicProcedure,
    procedureDef: TRPCMiddleware | Type<TRPCMiddleware>,
    routeProcedureDef: TRPCMiddleware | Type<TRPCMiddleware>,
  ): TRPCPublicProcedure {
    if (typeof procedureDef === 'function') {
      return this.createCustomProcedureInstance(procedureBuilder, procedureDef);
    } else if (typeof routeProcedureDef === 'function') {
      return this.createCustomProcedureInstance(
        procedureBuilder,
        routeProcedureDef,
      );
    }
    return procedureBuilder;
  }

  private createCustomProcedureInstance(
    procedure: TRPCPublicProcedure,
    def: Type<TRPCMiddleware>,
  ): TRPCPublicProcedure {
    const customProcedureInstance = this.moduleRef.get(def, { strict: false });
    if (typeof customProcedureInstance.use === 'function') {
      //@ts-ignore
      return procedure.use((opts) => customProcedureInstance.use(opts));
    }
    return procedure;
  }

  private createSerializedProcedure(
    procedureInstance: TRPCPublicProcedure,
    procedureName: string,
    input: any,
    output: any,
    type: string,
    routerInstance: Function,
  ): any {
    const procedureWithInput = input
      ? procedureInstance.input(input)
      : procedureInstance;
    const procedureWithOutput = output
      ? procedureWithInput.output(output)
      : procedureWithInput;
    const procedureInvocation = (args: unknown) => {
      console.log({ args });
      return routerInstance[procedureName](args);
    };

    return type === 'mutation'
      ? procedureWithOutput.mutation(procedureInvocation)
      : procedureWithOutput.query(procedureInvocation);
  }
}
