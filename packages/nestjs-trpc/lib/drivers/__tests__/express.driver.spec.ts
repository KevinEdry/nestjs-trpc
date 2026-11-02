import { ExpressDriver } from '../express.driver';
import * as trpcExpress from '@trpc/server/adapters/express';
import type { AnyRouter } from '@trpc/server';
import type { TRPCAdapterOptions, TRPCErrorHandler } from '../../interfaces';

jest.mock('@trpc/server/adapters/express', () => ({
  createExpressMiddleware: jest.fn().mockReturnValue('express-middleware'),
}));

describe('ExpressDriver', () => {
  const createExpressMiddleware =
    trpcExpress.createExpressMiddleware as jest.Mock;
  const driver = new ExpressDriver();
  const appRouter = { _def: {} } as unknown as AnyRouter;
  let app: any;

  beforeEach(() => {
    app = { use: jest.fn() };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('mounts the middleware on the configured base path', async () => {
    await driver.start({ basePath: '/api/trpc' }, app, appRouter, null, null);

    expect(app.use).toHaveBeenCalledWith('/api/trpc', 'express-middleware');
  });

  it('passes adapter options through to createExpressMiddleware', async () => {
    const responseMeta = jest.fn();

    await driver.start({}, app, appRouter, null, null, {
      allowMethodOverride: true,
      responseMeta,
    } as TRPCAdapterOptions);

    expect(createExpressMiddleware).toHaveBeenCalledWith(
      expect.objectContaining({
        allowMethodOverride: true,
        responseMeta,
        router: appRouter,
      }),
    );
  });

  it('keeps the module-owned router and onError when adapter options carry them', async () => {
    class TestErrorHandler {
      onError = jest.fn();
    }
    const onErrorInstance = new TestErrorHandler() as TRPCErrorHandler;

    await driver.start(
      { onError: TestErrorHandler },
      app,
      appRouter,
      null,
      onErrorInstance,
      {
        router: 'user-router',
        onError: 'user-on-error',
      } as unknown as TRPCAdapterOptions,
    );

    const adapterArgs = createExpressMiddleware.mock.calls[0][0];
    expect(adapterArgs.router).toBe(appRouter);
    expect(typeof adapterArgs.onError).toBe('function');
  });
});
