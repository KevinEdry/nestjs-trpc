import 'reflect-metadata';
import { Mutation } from '../mutation.decorator';
import { PROCEDURE_METADATA_KEY, PROCEDURE_TYPE_KEY } from '../../trpc.constants';
import { ProcedureType } from '../../trpc.enum';
import { ZodSchema, z } from 'zod';

describe('Mutation Decorator', () => {
  it('should set procedure type metadata', () => {
    class TestClass {
      @Mutation()
      testMethod() {}
    }

    const metadata = Reflect.getMetadata(PROCEDURE_TYPE_KEY, TestClass.prototype.testMethod);
    expect(metadata).toBe(ProcedureType.Mutation);
  });

  it('should set procedure metadata with input and output schemas', () => {
    const inputSchema: ZodSchema = z.string();
    const outputSchema: ZodSchema = z.number();

    class TestClass {
      @Mutation({ input: inputSchema, output: outputSchema })
      testMethod() {}
    }

    const metadata = Reflect.getMetadata(PROCEDURE_METADATA_KEY, TestClass.prototype.testMethod);
    expect(metadata).toEqual({ input: inputSchema, output: outputSchema });
  });

  it('should set procedure metadata without schemas', () => {
    class TestClass {
      @Mutation()
      testMethod() {}
    }

    const metadata = Reflect.getMetadata(PROCEDURE_METADATA_KEY, TestClass.prototype.testMethod);
    expect(metadata).toBeUndefined();
  });

  it('should set procedure metadata with only input schema', () => {
    const inputSchema: ZodSchema = z.string();

    class TestClass {
      @Mutation({ input: inputSchema })
      testMethod() {}
    }

    const metadata = Reflect.getMetadata(PROCEDURE_METADATA_KEY, TestClass.prototype.testMethod);
    expect(metadata).toEqual({ input: inputSchema });
  });

  it('should set procedure metadata with only output schema', () => {
    const outputSchema: ZodSchema = z.number();

    class TestClass {
      @Mutation({ output: outputSchema })
      testMethod() {}
    }

    const metadata = Reflect.getMetadata(PROCEDURE_METADATA_KEY, TestClass.prototype.testMethod);
    expect(metadata).toEqual({ output: outputSchema });
  });
});