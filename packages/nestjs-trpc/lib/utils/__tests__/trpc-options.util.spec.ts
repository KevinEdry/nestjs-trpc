import type { LoggerService } from '@nestjs/common';
import {
  resolveTRPCOptions,
  splitTRPCOptions,
} from '../trpc-options.util';
import type { TRPCModuleOptions, TRPCOptions } from '../../interfaces';

describe('resolveTRPCOptions', () => {
  let logger: LoggerService;

  beforeEach(() => {
    logger = { log: jest.fn(), warn: jest.fn(), error: jest.fn() };
  });

  it('returns the trpc options untouched when no deprecated keys are set', () => {
    const options: TRPCModuleOptions = {
      trpc: { allowMethodOverride: true },
    };

    expect(resolveTRPCOptions(options, logger)).toEqual({
      allowMethodOverride: true,
    });
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('merges deprecated top-level keys into the trpc options with a warning', () => {
    const transformer = { serialize: jest.fn(), deserialize: jest.fn() };
    const options: TRPCModuleOptions = {
      transformer,
      sse: { enabled: false },
    };

    expect(resolveTRPCOptions(options, logger)).toEqual({
      transformer,
      sse: { enabled: false },
    });
    expect(logger.warn).toHaveBeenCalledTimes(2);
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('"transformer" option is deprecated'),
      'TRPCModule',
    );
  });

  it('prefers the trpc key over a deprecated top-level duplicate', () => {
    const flatTransformer = { serialize: jest.fn(), deserialize: jest.fn() };
    const trpcTransformer = { serialize: jest.fn(), deserialize: jest.fn() };
    const options: TRPCModuleOptions = {
      transformer: flatTransformer,
      trpc: { transformer: trpcTransformer },
    };

    const resolved = resolveTRPCOptions(options, logger);

    expect(resolved.transformer).toBe(trpcTransformer);
    expect(logger.warn).toHaveBeenCalledTimes(1);
  });
});

describe('splitTRPCOptions', () => {
  it('routes root config keys to rootConfig and the rest to adapterOptions', () => {
    const transformer = { serialize: jest.fn(), deserialize: jest.fn() };
    const errorFormatter = jest.fn();
    const responseMeta = jest.fn();

    const { rootConfig, adapterOptions } = splitTRPCOptions({
      transformer,
      errorFormatter,
      sse: { enabled: true },
      jsonl: { pingMs: 1000 },
      allowMethodOverride: true,
      responseMeta,
      maxBodySize: 100,
    } as TRPCOptions);

    expect(rootConfig).toEqual({
      transformer,
      errorFormatter,
      sse: { enabled: true },
      jsonl: { pingMs: 1000 },
    });
    expect(adapterOptions).toEqual({
      allowMethodOverride: true,
      responseMeta,
      maxBodySize: 100,
    });
  });

  it('strips the module-owned router, createContext, and onError keys', () => {
    const { rootConfig, adapterOptions } = splitTRPCOptions({
      router: 'user-router',
      createContext: 'user-create-context',
      onError: 'user-on-error',
      allowMethodOverride: true,
    } as unknown as TRPCOptions);

    expect(rootConfig).toEqual({});
    expect(adapterOptions).toEqual({ allowMethodOverride: true });
  });
});
