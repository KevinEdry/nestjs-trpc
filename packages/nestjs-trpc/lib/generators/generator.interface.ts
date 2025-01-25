import type { SchemaImports, TRPCContext } from '../interfaces';
import type { Class } from 'type-fest';
import type { RootConfigTypes } from '@trpc/server/dist/core/internals/config';

export interface GeneratorModuleOptions {
  rootModuleFilePath: string;
  context?: Class<TRPCContext>;
  outputDirPath?: string;
  schemaFileImports?: Array<SchemaImports>;
  transformer?: RootConfigTypes['transformer'];
}
