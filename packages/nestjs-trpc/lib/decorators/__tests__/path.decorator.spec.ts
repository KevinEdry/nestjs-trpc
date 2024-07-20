import 'reflect-metadata';
import { Path } from '../path.decorator';
import { PROCEDURE_PARAM_METADATA_KEY } from '../../trpc.constants';
import { ProcedureParamDecoratorType } from '../../interfaces/factory.interface';

describe('Path Decorator', () => {
  class TestClass {
    testMethod(@Path() param1: string, @Path() param2: string) {}
  }

  it('should add metadata to the method', () => {
    const metadata = Reflect.getMetadata(PROCEDURE_PARAM_METADATA_KEY, TestClass.prototype, 'testMethod');
    expect(metadata).toBeDefined();
    expect(Array.isArray(metadata)).toBe(true);
  });

  it('should add correct metadata for each parameter', () => {
    const metadata = Reflect.getMetadata(PROCEDURE_PARAM_METADATA_KEY, TestClass.prototype, 'testMethod');
    expect(metadata).toHaveLength(2);

    expect(metadata[0]).toEqual({
      type: ProcedureParamDecoratorType.Path,
      index: 1,
    });

    expect(metadata[1]).toEqual({
      type: ProcedureParamDecoratorType.Path,
      index: 0,
    });
  });

  it('should append to existing metadata', () => {
    class TestClassWithExistingMetadata {
      testMethod(@Path() param1: string) {}
    }

    // Simulate existing metadata
    const existingMetadata = [{ type: 'SomeOtherDecorator', index: 0 }];
    Reflect.defineMetadata(PROCEDURE_PARAM_METADATA_KEY, existingMetadata, TestClassWithExistingMetadata.prototype, 'testMethod');

    // Apply our decorator
    Path()(TestClassWithExistingMetadata.prototype, 'testMethod', 1);

    const metadata = Reflect.getMetadata(PROCEDURE_PARAM_METADATA_KEY, TestClassWithExistingMetadata.prototype, 'testMethod');
    expect(metadata).toHaveLength(2);
    expect(metadata[1]).toEqual({
      type: ProcedureParamDecoratorType.Path,
      index: 1,
    });
  });
});