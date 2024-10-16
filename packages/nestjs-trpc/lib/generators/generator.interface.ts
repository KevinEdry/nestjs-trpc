import type { SchemaImports, TRPCContext } from '../interfaces';
import type { Class } from 'type-fest';

export interface GeneratorModuleOptions {
  rootModuleFilePath: string;
  context?: Class<TRPCContext>;
  outputDirPath?: string;
  schemaFileImports?: Array<SchemaImports>;
}
