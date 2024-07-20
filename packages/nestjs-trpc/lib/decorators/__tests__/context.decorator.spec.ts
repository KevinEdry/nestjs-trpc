import 'reflect-metadata';
import { Ctx } from '../context.decorator';
import { PROCEDURE_PARAM_METADATA_KEY } from '../../trpc.constants';
import { ProcedureParamDecoratorType } from '../../interfaces/factory.interface';

describe('Context Decorator', () => {
  class TestClass {
    testMethod(@Ctx() param1: any, @Ctx() param2: any) {}
  }

  it('should add metadata to the method parameters', () => {
    const metadata = Reflect.getMetadata(PROCEDURE_PARAM_METADATA_KEY, TestClass.prototype, 'testMethod');
    expect(metadata).toBeDefined();
    expect(Array.isArray(metadata)).toBe(true);
  });

  it('should add correct metadata for each parameter', () => {
    const metadata = Reflect.getMetadata(PROCEDURE_PARAM_METADATA_KEY, TestClass.prototype, 'testMethod');
    expect(metadata).toHaveLength(2);

    expect(metadata[0]).toEqual({
      type: ProcedureParamDecoratorType.Ctx,
      index: 1,
    });

    expect(metadata[1]).toEqual({
      type: ProcedureParamDecoratorType.Ctx,
      index: 0,
    });
  });

  it('should not add metadata for properties', () => {
    const metadata = Reflect.getMetadata(PROCEDURE_PARAM_METADATA_KEY, TestClass.prototype, 'testProperty');
    expect(metadata).toBeUndefined();
  });

  it('should append to existing metadata', () => {
    class TestClassWithExistingMetadata {
      testMethod(@Ctx() param1: any) {}
    }

    // Simulate existing metadata
    const existingMetadata = [{ type: 'SomeOtherDecorator', index: 0 }];
    Reflect.defineMetadata(PROCEDURE_PARAM_METADATA_KEY, existingMetadata, TestClassWithExistingMetadata.prototype, 'testMethod');

    // Apply our decorator
    Ctx()(TestClassWithExistingMetadata.prototype, 'testMethod', 1);

    const metadata = Reflect.getMetadata(PROCEDURE_PARAM_METADATA_KEY, TestClassWithExistingMetadata.prototype, 'testMethod');
    expect(metadata).toHaveLength(2);
    expect(metadata[1]).toEqual({
      type: ProcedureParamDecoratorType.Ctx,
      index: 1,
    });
  });
});