import { Inject, Injectable } from '@nestjs/common';
import { Class, Constructor } from 'type-fest';
import { TRPCMiddleware, TRPCModuleOptions } from '../interfaces';
import { RouterFactory } from './router.factory';
import { ProcedureFactory } from './procedure.factory';
import { isEqual, uniqWith } from 'lodash';
import { TRPC_MODULE_OPTIONS } from '../trpc.constants';

interface MiddlewareMetadata {
  instance: Class<TRPCMiddleware> | Constructor<TRPCMiddleware>;
}

@Injectable()
export class MiddlewareFactory {
  constructor(
    private readonly routerFactory: RouterFactory,
    private readonly procedureFactory: ProcedureFactory,
    @Inject(TRPC_MODULE_OPTIONS)
    private readonly options: TRPCModuleOptions,
  ) {}

  getMiddlewares(): Array<MiddlewareMetadata> {
    const routers = this.routerFactory.getRouters();

    const globalMiddlewaresMetadata: Array<MiddlewareMetadata> = (
      this.options.globalMiddlewares ?? []
    ).map((middleware) => ({
      instance: middleware,
    }));

    const routerMiddlewaresMetadata = routers.flatMap((router) => {
      const { instance, middlewares } = router;
      const prototype = Object.getPrototypeOf(instance);
      const procedures = this.procedureFactory.getProcedures(
        instance,
        prototype,
      );

      const procedureMiddleware = procedures.flatMap((procedure) => {
        return procedure.middlewares ?? [];
      });

      return [...middlewares, ...procedureMiddleware].map((middleware) => ({
        instance: middleware,
      }));
    });

    return uniqWith(
      [...globalMiddlewaresMetadata, ...routerMiddlewaresMetadata],
      isEqual,
    );
  }
}
