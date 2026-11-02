import type { LoggerService } from '@nestjs/common';
import type { TRPCRuntimeConfigOptions } from '@trpc/server';
import type {
  TRPCAdapterOptions,
  TRPCModuleOptions,
  TRPCOptions,
} from '../interfaces';

const DEPRECATED_FLAT_KEYS = [
  'transformer',
  'errorFormatter',
  'sse',
  'jsonl',
] as const;

export function resolveTRPCOptions(
  options: TRPCModuleOptions,
  logger: LoggerService,
): TRPCOptions {
  for (const key of DEPRECATED_FLAT_KEYS) {
    if (options[key] != null) {
      logger.warn(
        `The top-level "${key}" option is deprecated and will be removed in the next major version. Move it to the "trpc" key: TRPCModule.forRoot({ trpc: { ${key} } }).`,
        'TRPCModule',
      );
    }
  }

  const { transformer, errorFormatter, sse, jsonl } = options;

  return {
    ...(transformer != null ? { transformer } : {}),
    ...(errorFormatter != null ? { errorFormatter } : {}),
    ...(sse != null ? { sse } : {}),
    ...(jsonl != null ? { jsonl } : {}),
    ...options.trpc,
  };
}

export function splitTRPCOptions(trpcOptions: TRPCOptions): {
  rootConfig: TRPCRuntimeConfigOptions<object, object>;
  adapterOptions: TRPCAdapterOptions;
} {
  const stripped = { ...trpcOptions };
  delete stripped.router;
  delete stripped.createContext;
  delete stripped.onError;

  const {
    transformer,
    errorFormatter,
    allowOutsideOfServer,
    isServer,
    isDev,
    defaultMeta,
    sse,
    jsonl,
    experimental,
    ...adapterOptions
  } = stripped;

  return {
    rootConfig: {
      ...(transformer != null ? { transformer } : {}),
      ...(errorFormatter != null ? { errorFormatter } : {}),
      ...(allowOutsideOfServer != null ? { allowOutsideOfServer } : {}),
      ...(isServer != null ? { isServer } : {}),
      ...(isDev != null ? { isDev } : {}),
      ...(defaultMeta != null ? { defaultMeta } : {}),
      ...(sse != null ? { sse } : {}),
      ...(jsonl != null ? { jsonl } : {}),
      ...(experimental != null ? { experimental } : {}),
    },
    adapterOptions,
  };
}
