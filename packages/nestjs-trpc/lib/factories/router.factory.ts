import { ConsoleLogger, Injectable } from '@nestjs/common';
import { ModulesContainer } from '@nestjs/core';
import { InstanceWrapper } from '@nestjs/core/injector/instance-wrapper';
import { camelCase } from 'lodash';
import {
  PROCEDURE_KEY,
  ROUTER_METADATA_KEY
} from '../trpc.constants';
import {
  RouterInstance,
  TRPCPublicProcedure,
  TRPCRouter,
} from '../interfaces/factory.interface';
import { TRPCProcedure } from '../interfaces';
import { ProcedureFactory } from './procedure.factory';

@Injectable()
export class RouterFactory {
  constructor(
    private readonly consoleLogger: ConsoleLogger,
    private readonly modulesContainer: ModulesContainer,
    private readonly procedureFactory: ProcedureFactory
  ) {}

  getRouters(): Array<RouterInstance> {
    const routers: Array<RouterInstance> = [];

    this.modulesContainer.forEach((moduleRef) => {
      moduleRef.providers.forEach((wrapper: InstanceWrapper) => {
        const router = this.extractRouterFromWrapper(wrapper);
        if (router) {
          routers.push(router);
        }
      });
    });

    return routers;
  }

  private extractRouterFromWrapper(wrapper: InstanceWrapper): RouterInstance | undefined {
    const { instance, name } = wrapper;
    if (!instance) return undefined;

    const router = Reflect.getMetadata(ROUTER_METADATA_KEY, instance.constructor);
    const routeProcedureDef: TRPCProcedure = Reflect.getMetadata(PROCEDURE_KEY, instance.constructor);

    if (router != null) {
      return { name, instance, alias: router.alias, routeProcedureDef };
    }

    return undefined;
  }

  serializeRoutes(router: TRPCRouter, procedure: TRPCPublicProcedure): Record<string, any> {
    const routers = this.getRouters();
    const routerSchema = {};

    routers.forEach(route => {
      const { instance, name, routeProcedureDef, alias } = route;
      const camelCasedRouterName = camelCase(alias ?? name);
      const prototype = Object.getPrototypeOf(instance);

      const procedures = this.procedureFactory.getProcedures(instance, prototype);

      this.consoleLogger.log(`Router ${name} as ${camelCasedRouterName}.`, 'Router Factory');

      routerSchema[camelCasedRouterName] = this.procedureFactory.serializeProcedures(
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