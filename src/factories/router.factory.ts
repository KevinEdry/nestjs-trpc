import { ConsoleLogger, Inject, Injectable } from '@nestjs/common';
import { ModulesContainer } from '@nestjs/core';
import { InstanceWrapper } from '@nestjs/core/injector/instance-wrapper';
import { camelCase } from 'lodash';
import { MIDDLEWARE_KEY, ROUTER_METADATA_KEY } from '../trpc.constants';
import {
  RouterInstance,
  TRPCPublicProcedure,
  TRPCRouter,
} from '../interfaces/factory.interface';
import { TRPCMiddleware } from '../interfaces';
import { ProcedureFactory } from './procedure.factory';

@Injectable()
export class RouterFactory {
  @Inject(ConsoleLogger)
  private readonly consoleLogger!: ConsoleLogger;

  @Inject(ModulesContainer)
  private readonly modulesContainer!: ModulesContainer;

  @Inject(ProcedureFactory)
  private readonly procedureFactory!: ProcedureFactory;

  getRouters(): Array<RouterInstance> {
    const routers: Array<RouterInstance> = [];

    this.modulesContainer.forEach((moduleRef) => {
      moduleRef.providers.forEach((wrapper: InstanceWrapper) => {
        const router = this.extractRouterFromWrapper(wrapper);
        if (router != null) {
          routers.push(router);
        }
      });
    });

    return routers;
  }

  private extractRouterFromWrapper(
    wrapper: InstanceWrapper,
  ): RouterInstance | undefined {
    const { instance, name } = wrapper;

    const router = Reflect.getMetadata(
      ROUTER_METADATA_KEY,
      instance.constructor,
    );
    const middlewares: TRPCMiddleware = Reflect.getMetadata(
      MIDDLEWARE_KEY,
      instance.constructor,
    );

    if (router != null) {
      return { name, instance, alias: router.alias, middlewares };
    }

    return undefined;
  }

  serializeRoutes(
    procedure: TRPCPublicProcedure,
  ): Record<string, any> {
    const routers = this.getRouters();
    const routerSchema = Object.create({});

    routers.forEach((route) => {
      const { instance, name, middlewares, alias } = route;
      const camelCasedRouterName = camelCase(alias ?? name);
      const prototype = Object.getPrototypeOf(instance);

      const procedures = this.procedureFactory.getProcedures(
        instance,
        prototype,
      );

      this.consoleLogger.log(
        `Router ${name} as ${camelCasedRouterName}.`,
        'Router Factory',
      );

      routerSchema[camelCasedRouterName] =
        this.procedureFactory.serializeProcedures(
          procedures,
          instance,
          camelCasedRouterName,
          procedure,
          middlewares
        );
    });

    return routerSchema;
  }
}
