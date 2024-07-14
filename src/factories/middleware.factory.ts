import { Inject, Injectable } from '@nestjs/common';
import { Class } from 'type-fest';
import { TRPCMiddleware } from '../interfaces';
import { RouterFactory } from './router.factory';
import { ProcedureFactory } from './procedure.factory';

@Injectable()
export class MiddlewareFactory {
  constructor(
    @Inject(RouterFactory) private readonly routerFactory: RouterFactory,
    @Inject(ProcedureFactory)
    private readonly procedureFactory: ProcedureFactory,
  ) {}
  getMiddlewares(): Array<Class<TRPCMiddleware>> {
    const routers = this.routerFactory.getRouters();

    const middlewares = routers.flatMap((route) => {
      const { instance } = route;
      const prototype = Object.getPrototypeOf(instance);
      const procedures = this.procedureFactory.getProcedures(
        instance,
        prototype,
      );

      return procedures.flatMap((procedure) => procedure.middlewares);
    });

    // Returns a unique middleware array since we need to generate types only one time.
    return [...new Set(middlewares)];
  }
}
