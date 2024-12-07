import 'reflect-metadata';
import { UseMiddlewares } from '../middlewares.decorator';
import { MIDDLEWARES_KEY } from '../../trpc.constants';
import { MiddlewareOptions, MiddlewareResponse, TRPCMiddleware } from '../../interfaces';

describe('UseMiddlewares Decorator', () => {
  class TestMiddleware implements TRPCMiddleware {
    use(opts: MiddlewareOptions<object>): MiddlewareResponse | Promise<MiddlewareResponse> {
      throw new Error('Method not implemented.');
    }
  }

  it('should add metadata to the class', () => {
    @UseMiddlewares(TestMiddleware)
    class TestClass {}

    const metadata = Reflect.getMetadata(MIDDLEWARES_KEY, TestClass);
    expect(metadata).toStrictEqual([TestMiddleware]);
  });

  it('should add metadata to the method', () => {
    class TestClass {
      @UseMiddlewares(TestMiddleware)
      testMethod() {}
    }

    const metadata = Reflect.getMetadata(MIDDLEWARES_KEY, TestClass.prototype.testMethod);
    expect(metadata).toStrictEqual([TestMiddleware]);
  });

  it('should throw an error for invalid middleware on class', () => {
    expect(() => {
      @UseMiddlewares({} as any)
      class TestClass {}
    }).toThrow();
  });

  it('should throw an error for invalid middleware on method', () => {
    expect(() => {
      class TestClass {
        @UseMiddlewares({} as any)
        testMethod() {}
      }
    }).toThrow();
  });
});