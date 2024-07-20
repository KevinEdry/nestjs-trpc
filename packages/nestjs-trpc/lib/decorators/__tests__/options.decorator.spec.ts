import 'reflect-metadata';
import { Options } from '../options.decorator';
import { PROCEDURE_PARAM_METADATA_KEY } from '../../trpc.constants';
import { ProcedureParamDecoratorType } from '../../interfaces/factory.interface';

describe('Options Decorator', () => {
  class TestClass {
    testMethod(@Options() param1: any, @Options() param2: any) {}
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
      type: ProcedureParamDecoratorType.Options,
      index: 1,
    });

    expect(metadata[1]).toEqual({
      type: ProcedureParamDecoratorType.Options,
      index: 0,
    });
  });

  it('should append to existing metadata', () => {
    class TestClassWithExistingMetadata {
      testMethod(@Options() param1: any) {}
    }

    // Simulate existing metadata
    const existingMetadata = [{ type: 'SomeOtherDecorator', index: 0 }];
    Reflect.defineMetadata(PROCEDURE_PARAM_METADATA_KEY, existingMetadata, TestClassWithExistingMetadata.prototype, 'testMethod');

    // Apply our decorator
    Options()(TestClassWithExistingMetadata.prototype, 'testMethod', 1);

    const metadata = Reflect.getMetadata(PROCEDURE_PARAM_METADATA_KEY, TestClassWithExistingMetadata.prototype, 'testMethod');
    expect(metadata).toHaveLength(2);
    expect(metadata[1]).toEqual({
      type: ProcedureParamDecoratorType.Options,
      index: 1,
    });
  });
});