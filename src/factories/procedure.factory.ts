import { ConsoleLogger, Inject, Injectable, Type } from '@nestjs/common';
import { MetadataScanner, ModuleRef } from '@nestjs/core';
import {
  PROCEDURE_METADATA_KEY,
  PROCEDURE_TYPE_KEY,
  MIDDLEWARE_KEY,
  PROCEDURE_PARAM_METADATA_KEY,
} from '../trpc.constants';
import {
  ProcedureFactoryMetadata,
  ProcedureParamDecorator,
  ProcedureParamDecoratorType,
  TRPCPublicProcedure,
  ProcedureImplementation,
} from '../interfaces/factory.interface';
import { TRPCMiddleware, ProcedureOptions } from '../interfaces';
import type { Class } from 'type-fest';

@Injectable()
export class ProcedureFactory {
  @Inject(ConsoleLogger)
  private readonly consoleLogger!: ConsoleLogger;
  
  @Inject(MetadataScanner)
  private readonly metadataScanner!: MetadataScanner;

  constructor(private moduleRef: ModuleRef) {}
  
  getProcedures(
    instance: unknown,
    prototype: Record<string, Function>,
  ): Array<ProcedureFactoryMetadata> {
    return this.metadataScanner.scanFromPrototype(instance, prototype, (name) =>
      this.extractProcedureMetadata(name, prototype),
    );
  }

  private extractProcedureParams(
    prototype: object,
    name: string,
  ): Array<ProcedureParamDecorator> {
    return Reflect.getMetadata(PROCEDURE_PARAM_METADATA_KEY, prototype, name);
  }

  private extractProcedureMetadata(
    name: string,
    prototype: Record<string, Function>,
  ): ProcedureFactoryMetadata {
    const callback = prototype[name] as ProcedureImplementation;
    const type = Reflect.getMetadata(PROCEDURE_TYPE_KEY, callback);
    const metadata = Reflect.getMetadata(PROCEDURE_METADATA_KEY, callback);
    const middlewares: Class<TRPCMiddleware> = Reflect.getMetadata(
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
      params: this.extractProcedureParams(prototype, name),
    };
  }

  serializeProcedures(
    procedures: Array<ProcedureFactoryMetadata>,
    instance: any,
    camelCasedRouterName: string,
    procedureBuilder: TRPCPublicProcedure,
    routerMiddlewares: TRPCMiddleware | undefined,
  ): Record<string, any> {
    const serializedProcedures = Object.create({});

    for (const procedure of procedures) {
      const { input, output, type, middlewares, name, params } = procedure;
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
        params,
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
    procedureDef: TRPCMiddleware | Type<TRPCMiddleware> | undefined,
    routeProcedureDef: TRPCMiddleware | Type<TRPCMiddleware> | undefined,
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

  private serializeProcedureParams(
    opts: ProcedureOptions,
    params: Array<ProcedureParamDecorator> | undefined,
  ): Array<undefined | unknown> {
    if(params == null) {
      return [];
    }
    const args = new Array(Math.max(...params.map((val) => val.index)) + 1)
      .fill(undefined)
      .map((_val, idx) => {
        const param = params.find((param) => param.index === idx);
        if (param == null) {
          return undefined;
        }
        if (param.type === ProcedureParamDecoratorType.Input) {
          //@ts-ignore
          return param.key != null ? opts[param.type]?.[param.key] : opts[param.type];
        }
        if (param.type === ProcedureParamDecoratorType.Options) {
          return opts;
        }
        return opts[param.type];
      });

    console.log({args})
    return args;
  }

  private createSerializedProcedure(
    procedureInstance: TRPCPublicProcedure,
    procedureName: string,
    input: any,
    output: any,
    type: string,
    routerInstance: Record<string, (...args: any[]) => any>,
    params: Array<ProcedureParamDecorator> | undefined,
  ): any {
    const procedureWithInput = input
      ? procedureInstance.input(input)
      : procedureInstance;
    const procedureWithOutput = output
      ? procedureWithInput.output(output)
      : procedureWithInput;

    const procedureInvocation = (opts: ProcedureOptions) => {
      return routerInstance[procedureName](
        ...this.serializeProcedureParams(opts, params),
      );
    };

    return type === 'mutation'
      ? //@ts-ignore
        procedureWithOutput.mutation(procedureInvocation)
      : //@ts-ignore
        procedureWithOutput.query(procedureInvocation);
  }
}
