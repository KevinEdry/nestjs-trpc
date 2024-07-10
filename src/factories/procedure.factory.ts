import { ConsoleLogger, Injectable, Type } from '@nestjs/common';
import { MetadataScanner, ModuleRef } from '@nestjs/core';
import {
  PROCEDURE_METADATA_KEY,
  PROCEDURE_TYPE_KEY,
  PROCEDURE_KEY,
} from '../trpc.constants';
import {
  ProcedureFactoryMetadata,
  TRPCPublicProcedure,
} from '../interfaces/factory.interface';
import { TRPCProcedure } from '../interfaces';

@Injectable()
export class ProcedureFactory {
  constructor(
    private readonly consoleLogger: ConsoleLogger,
    private readonly metadataScanner: MetadataScanner,
    private readonly moduleRef: ModuleRef
  ) {}

  getProcedures(instance: unknown, prototype: object): Array<ProcedureFactoryMetadata> {
    return this.metadataScanner.scanFromPrototype(
      instance,
      prototype,
      (name) => this.extractProcedureMetadata(name, prototype)
    );
  }

  private extractProcedureMetadata(name: string, prototype: object): ProcedureFactoryMetadata {
    const callback = prototype[name];
    const type = Reflect.getMetadata(PROCEDURE_TYPE_KEY, callback);
    const metadata = Reflect.getMetadata(PROCEDURE_METADATA_KEY, callback);
    const procedureDef: TRPCProcedure = Reflect.getMetadata(PROCEDURE_KEY, callback);

    return {
      input: metadata?.input,
      output: metadata?.output,
      procedureDef,
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
    routeProcedureDef: TRPCProcedure
  ): Record<string, any> {
    const serializedProcedures = {};

    for (const procedure of procedures) {
      const { input, output, type, procedureDef, name } = procedure;
      const procedureInstance = this.createProcedureInstance(procedureBuilder, procedureDef, routeProcedureDef);
      const routerInstance = this.moduleRef.get(instance.constructor, {strict: false});

      serializedProcedures[name] = this.createSerializedProcedure(
        procedureInstance,
        name,
        input,
        output,
        type,
        routerInstance
      );

      this.consoleLogger.log(
        `Mapped {${type}, ${camelCasedRouterName}.${name}} route.`,
        'Router Factory'
      );
    }

    return serializedProcedures;
  }

  private createProcedureInstance(
    procedureBuilder: TRPCPublicProcedure,
    procedureDef: TRPCProcedure | Type<TRPCProcedure>,
    routeProcedureDef: TRPCProcedure | Type<TRPCProcedure>
  ): TRPCPublicProcedure {
    if (typeof procedureDef === "function") {
      return this.createCustomProcedureInstance(procedureBuilder, procedureDef);
    } else if (typeof routeProcedureDef === "function") {
      return this.createCustomProcedureInstance(procedureBuilder, routeProcedureDef);
    }
    return procedureBuilder;
  }

  private createCustomProcedureInstance(procedure: TRPCPublicProcedure, def: Type<TRPCProcedure>): TRPCPublicProcedure {
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
    routerInstance: Function
  ): any {
    const procedureWithInput = input ? procedureInstance.input(input) : procedureInstance;
    const procedureWithOutput = output ? procedureWithInput.output(output) : procedureWithInput;
    const procedureInvocation = (args: unknown) => {
      console.log({args})
      return routerInstance[procedureName](args);
    };

    return type === 'mutation'
      ? procedureWithOutput.mutation(procedureInvocation)
      : procedureWithOutput.query(procedureInvocation);
  }
}