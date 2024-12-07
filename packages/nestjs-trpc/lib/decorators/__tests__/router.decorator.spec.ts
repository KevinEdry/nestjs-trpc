import 'reflect-metadata';
import { Router } from '../router.decorator';
import { ROUTER_METADATA_KEY } from '../../trpc.constants';

describe('Router Decorator', () => {
  it('should set router metadata without alias', () => {
    @Router()
    class TestRouter {}

    const metadata = Reflect.getMetadata(ROUTER_METADATA_KEY, TestRouter);
    expect(metadata).toStrictEqual({alias: undefined, path: __filename})
  });

  it('should set router metadata with alias', () => {
    const alias = 'testAlias';

    @Router({ alias })
    class TestRouter {}

    const metadata = Reflect.getMetadata(ROUTER_METADATA_KEY, TestRouter);
    expect(metadata).toStrictEqual({alias, path: __filename})
  });

  it('should not affect class methods', () => {
    @Router()
    class TestRouter {
      testMethod() {}
    }

    const metadata = Reflect.getMetadata(ROUTER_METADATA_KEY, TestRouter.prototype.testMethod);
    expect(metadata).toBeUndefined();
  });

  it('should allow multiple routers with different aliases', () => {
    @Router({ alias: 'router1' })
    class TestRouter1 {}

    @Router({ alias: 'router2' })
    class TestRouter2 {}

    const metadata1 = Reflect.getMetadata(ROUTER_METADATA_KEY, TestRouter1);
    const metadata2 = Reflect.getMetadata(ROUTER_METADATA_KEY, TestRouter2);

    expect(metadata1).toEqual({ alias: 'router1', path: __filename });
    expect(metadata2).toEqual({ alias: 'router2', path: __filename });
  });
});