import { NodeDriver } from '../node.driver';
import * as trpcNodeHttp from '@trpc/server/adapters/node-http';
import type { AnyRouter } from '@trpc/server';
import type { TRPCAdapterOptions } from '../../interfaces';

jest.mock('@trpc/server/adapters/node-http', () => ({
  nodeHTTPRequestHandler: jest.fn().mockResolvedValue(undefined),
}));

describe('NodeDriver', () => {
  const nodeHTTPRequestHandler =
    trpcNodeHttp.nodeHTTPRequestHandler as jest.Mock;
  const driver = new NodeDriver();
  const appRouter = { _def: {} } as unknown as AnyRouter;
  let app: any;

  beforeEach(() => {
    app = { use: jest.fn() };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  function mountedMiddleware(): (req: any, res: any) => void {
    return app.use.mock.calls[0][1];
  }

  it('mounts on the configured base path', async () => {
    await driver.start({ basePath: '/api/trpc' }, app, appRouter, null, null);

    expect(app.use).toHaveBeenCalledWith('/api/trpc', expect.any(Function));
  });

  it('derives the procedure path from the prefix-stripped request url', async () => {
    await driver.start({}, app, appRouter, null, null);

    const req = { url: '/probe.hello?input=%7B%7D' };
    const res = {};
    mountedMiddleware()(req, res);

    expect(nodeHTTPRequestHandler).toHaveBeenCalledWith(
      expect.objectContaining({
        router: appRouter,
        path: 'probe.hello',
        req,
        res,
      }),
    );
  });

  it('passes adapter options through to nodeHTTPRequestHandler', async () => {
    const responseMeta = jest.fn();

    await driver.start({}, app, appRouter, null, null, {
      maxBodySize: 1024,
      responseMeta,
    } as TRPCAdapterOptions);

    mountedMiddleware()({ url: '/probe.hello' }, {});

    expect(nodeHTTPRequestHandler).toHaveBeenCalledWith(
      expect.objectContaining({
        maxBodySize: 1024,
        responseMeta,
        router: appRouter,
      }),
    );
  });

  it('keeps the module-owned router and onError when adapter options carry them', async () => {
    class TestErrorHandler {
      onError = jest.fn();
    }
    const onErrorInstance = new TestErrorHandler();

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

    mountedMiddleware()({ url: '/probe.hello' }, {});

    const handlerArgs = nodeHTTPRequestHandler.mock.calls[0][0];
    expect(handlerArgs.router).toBe(appRouter);
    expect(typeof handlerArgs.onError).toBe('function');
  });
});
