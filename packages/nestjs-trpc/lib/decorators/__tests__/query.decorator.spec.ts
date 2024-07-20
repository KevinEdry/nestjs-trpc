import 'reflect-metadata';
import { Query } from '../query.decorator';
import { PROCEDURE_METADATA_KEY, PROCEDURE_TYPE_KEY } from '../../trpc.constants';
import { ProcedureType } from '../../trpc.enum';
import { z } from 'zod';

describe('Query Decorator', () => {
  it('should set procedure type metadata', () => {
    class TestClass {
      @Query()
      testMethod() {}
    }

    const metadata = Reflect.getMetadata(PROCEDURE_TYPE_KEY, TestClass.prototype.testMethod);
    expect(metadata).toBe(ProcedureType.Query);
  });

  it('should set procedure metadata with input and output schemas', () => {
    const inputSchema = z.string();
    const outputSchema = z.number();

    class TestClass {
      @Query({ input: inputSchema, output: outputSchema })
      testMethod() {}
    }

    const metadata = Reflect.getMetadata(PROCEDURE_METADATA_KEY, TestClass.prototype.testMethod);
    expect(metadata).toEqual({ input: inputSchema, output: outputSchema });
  });

  it('should set procedure metadata without schemas', () => {
    class TestClass {
      @Query()
      testMethod() {}
    }

    const metadata = Reflect.getMetadata(PROCEDURE_METADATA_KEY, TestClass.prototype.testMethod);
    expect(metadata).toBeUndefined();
  });

  it('should set procedure metadata with only input schema', () => {
    const inputSchema = z.string();

    class TestClass {
      @Query({ input: inputSchema })
      testMethod() {}
    }

    const metadata = Reflect.getMetadata(PROCEDURE_METADATA_KEY, TestClass.prototype.testMethod);
    expect(metadata).toEqual({ input: inputSchema });
  });

  it('should set procedure metadata with only output schema', () => {
    const outputSchema = z.number();

    class TestClass {
      @Query({ output: outputSchema })
      testMethod() {}
    }

    const metadata = Reflect.getMetadata(PROCEDURE_METADATA_KEY, TestClass.prototype.testMethod);
    expect(metadata).toEqual({ output: outputSchema });
  });
});