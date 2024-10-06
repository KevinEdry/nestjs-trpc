import { Inject, Injectable } from '@nestjs/common';
import { Class, Constructor } from 'type-fest';
import { TRPCMiddleware } from '../interfaces';
import { RouterFactory } from './router.factory';
import { ProcedureFactory } from './procedure.factory';

interface MiddlewareMetadata {
  path: string;
  instance: Class<TRPCMiddleware> | Constructor<TRPCMiddleware>;
}

@Injectable()
export class MiddlewareFactory {
  @Inject(RouterFactory)
  private readonly routerFactory!: RouterFactory;

  @Inject(ProcedureFactory)
  private readonly procedureFactory!: ProcedureFactory;

  getMiddlewares(): Array<MiddlewareMetadata> {
    const routers = this.routerFactory.getRouters();

    const middlewaresMetadata = routers.flatMap((router) => {
      const { instance, middlewares, path } = router;
      const prototype = Object.getPrototypeOf(instance);
      const procedures = this.procedureFactory.getProcedures(
        instance,
        prototype,
      );

      const procedureMiddleware = procedures.flatMap((procedure) => {
        return procedure.middlewares != null ? procedure.middlewares : [];
      });

      return [...middlewares, ...procedureMiddleware].map((middleware) => ({
        path,
        instance: middleware,
      }));
    });

    // Return a unique array of middlewares based on both path and instances
    return middlewaresMetadata.reduce<MiddlewareMetadata[]>((acc, current) => {
      // Check if the combination of path and instances is already in the accumulator
      const exists = acc.some(
        (item) =>
          //TODO Check if it is possible to filter out unique based on instances.
          item.path === current.path && item.instance === current.instance,
      );

      // If not, add to the accumulator
      if (!exists) acc.push(current);

      return acc;
    }, []);
  }
}
