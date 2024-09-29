import { Injectable } from '@nestjs/common';
import { AnyRouter } from '@trpc/server';

@Injectable()
export class AppRouterHost {
  private _appRouter: AnyRouter | undefined;

  set appRouter(schemaRef: AnyRouter) {
    this._appRouter = schemaRef;
  }

  get appRouter(): AnyRouter {
    if (!this._appRouter) {
      throw new Error(
        'TRPC appRouter has not yet been created. ' +
          'Make sure to call the "AppRouterHost#appRouter" getter when the application is already initialized (after the "onModuleInit" hook triggered by either "app.listen()" or "app.init()" method).',
      );
    }
    return this._appRouter;
  }
}
