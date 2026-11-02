import { FastifyDriver } from '../fastify.driver';
import * as trpcFastify from '@trpc/server/adapters/fastify';
import type { AnyRouter } from '@trpc/server';
import type { TRPCAdapterOptions, TRPCErrorHandler } from '../../interfaces';

jest.mock('@trpc/server/adapters/fastify', () => ({
  fastifyTRPCPlugin: jest.fn(),
}));

describe('FastifyDriver', () => {
  const driver = new FastifyDriver();
  const appRouter = { _def: {} } as unknown as AnyRouter;
  let app: any;

  beforeEach(() => {
    app = { register: jest.fn() };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('registers the plugin on the configured base path', async () => {
    await driver.start({ basePath: '/api/trpc' }, app, appRouter, null, null);

    expect(app.register).toHaveBeenCalledWith(
      trpcFastify.fastifyTRPCPlugin,
      expect.objectContaining({ prefix: '/api/trpc' }),
    );
  });

  it('passes adapter options through to the plugin trpcOptions', async () => {
    const responseMeta = jest.fn();

    await driver.start({}, app, appRouter, null, null, {
      allowMethodOverride: true,
      responseMeta,
    } as TRPCAdapterOptions);

    const { trpcOptions } = app.register.mock.calls[0][1];
    expect(trpcOptions).toEqual(
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

    const { trpcOptions } = app.register.mock.calls[0][1];
    expect(trpcOptions.router).toBe(appRouter);
    expect(typeof trpcOptions.onError).toBe('function');
  });
});
