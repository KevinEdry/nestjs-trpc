import { Inject, Injectable } from '@nestjs/common';
import type { LoggerService } from '@nestjs/common';
import { MetadataScanner, ModuleRef } from '@nestjs/core';
import {
  MIDDLEWARES_KEY,
  PROCEDURE_METADATA_KEY,
  PROCEDURE_PARAM_METADATA_KEY,
  PROCEDURE_TYPE_KEY,
  TRPC_LOGGER,
} from '../trpc.constants';
import {
  ProcedureFactoryMetadata,
  ProcedureImplementation,
  ProcedureParamDecorator,
  ProcedureParamDecoratorType,
  TRPCPublicProcedure,
} from '../interfaces/factory.interface';
import { ProcedureOptions, TRPCMiddleware } from '../interfaces';
import type { Class, Constructor } from 'type-fest';
import { ProcedureType } from '../trpc.enum';
import { uniqWith, isEqual } from 'lodash';

@Injectable()
export class ProcedureFactory {
  constructor(
    @Inject(TRPC_LOGGER) private readonly logger: LoggerService,
    @Inject(MetadataScanner) private readonly metadataScanner: MetadataScanner,
    @Inject(ModuleRef) private readonly moduleRef: ModuleRef,
  ) {}

  getProcedures(
    instance: any,
    prototype: Record<string, (...args: Array<unknown>) => unknown>,
  ): Array<ProcedureFactoryMetadata> {
    const methodNames = this.metadataScanner.getAllMethodNames(instance);

    return methodNames.map((name) =>
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
    prototype: Record<string, ProcedureImplementation>,
  ): ProcedureFactoryMetadata {
    const callback = prototype[name];

    const type = Reflect.getMetadata(PROCEDURE_TYPE_KEY, callback);
    const metadata = Reflect.getMetadata(PROCEDURE_METADATA_KEY, callback);

    const middlewares: Array<
      Class<TRPCMiddleware> | Constructor<TRPCMiddleware>
    > = Reflect.getMetadata(MIDDLEWARES_KEY, callback) || [];

    return {
      input: metadata?.input,
      output: metadata?.output,
      meta: metadata?.meta,
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
    routerMiddlewares: Array<
      Constructor<TRPCMiddleware> | Class<TRPCMiddleware>
    >,
  ): Record<string, any> {
    const serializedProcedures = Object.create({});

    for (const procedure of procedures) {
      const { input, output, meta, type, middlewares, name, params } =
        procedure;

      const uniqueMiddlewares = uniqWith(
        [...routerMiddlewares, ...middlewares],
        isEqual,
      );
      const procedureInstance = this.createProcedureInstance(
        procedureBuilder,
        uniqueMiddlewares,
      );
      const routerInstance = this.moduleRef.get(instance.constructor, {
        strict: false,
      });

      serializedProcedures[name] = this.createSerializedProcedure(
        procedureInstance,
        name,
        input,
        output,
        meta,
        type,
        routerInstance,
        params,
      );

      this.logger.log(
        `Mapped {${type}, ${camelCasedRouterName}.${name}} route.`,
        'Router Factory',
      );
    }

    return serializedProcedures;
  }

  private createProcedureInstance(
    procedure: TRPCPublicProcedure,
    middlewares: Array<Constructor<TRPCMiddleware> | Class<TRPCMiddleware>>,
  ): TRPCPublicProcedure {
    for (const middleware of middlewares) {
      const customProcedureInstance = this.moduleRef.get(middleware, {
        strict: false,
      });
      if (typeof customProcedureInstance.use === 'function') {
        //@ts-expect-error this is expected since the type is correct.
        procedure = procedure.use((opts) => customProcedureInstance.use(opts));
      }
    }
    return procedure;
  }

  private serializeProcedureParams(
    opts: ProcedureOptions,
    params: Array<ProcedureParamDecorator> | undefined,
  ): Array<undefined | unknown> {
    if (params == null) {
      return [];
    }
    return new Array(Math.max(...params.map((val) => val.index)) + 1)
      .fill(undefined)
      .map((_val, idx) => {
        const param = params.find((param) => param.index === idx);
        if (param == null) {
          return undefined;
        }
        if (param.type === ProcedureParamDecoratorType.Input) {
          return param['key'] != null
            ? opts[param.type]?.[param['key']]
            : opts[param.type];
        }
        if (param.type === ProcedureParamDecoratorType.Options) {
          return opts;
        }
        return opts[param.type];
      });
  }

  private createSerializedProcedure(
    procedureInstance: TRPCPublicProcedure,
    procedureName: string,
    input: any,
    output: any,
    meta: Record<string, unknown> | undefined,
    type: string,
    routerInstance: Record<string, (...args: any[]) => any>,
    params: Array<ProcedureParamDecorator> | undefined,
  ): any {
    const procedureWithMeta = meta
      ? procedureInstance.meta(meta)
      : procedureInstance;
    const procedureWithInput = input
      ? procedureWithMeta.input(input)
      : procedureWithMeta;
    const procedureWithOutput = output
      ? procedureWithInput.output(output)
      : procedureWithInput;

    const procedureInvocation = (opts: ProcedureOptions) => {
      return routerInstance[procedureName](
        ...this.serializeProcedureParams(opts, params),
      );
    };

    if (type === ProcedureType.Mutation) {
      return procedureWithOutput.mutation(procedureInvocation as any);
    }
    if (type === ProcedureType.Subscription) {
      return procedureWithOutput.subscription(procedureInvocation as any);
    }
    return procedureWithOutput.query(procedureInvocation as any);
  }
}
