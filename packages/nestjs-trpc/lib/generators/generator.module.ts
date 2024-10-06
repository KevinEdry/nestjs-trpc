import { ConsoleLogger, Module } from '@nestjs/common';
import { DynamicModule } from '@nestjs/common/interfaces';
import { MetadataScanner } from '@nestjs/core';
import { CompilerOptions, ModuleKind, Project, ScriptTarget } from 'ts-morph';

import { TRPCGenerator } from './trpc.generator';
import { RouterGenerator } from './router.generator';
import { StaticGenerator } from './static.generator';
import { ContextGenerator } from './context.generator';
import { MiddlewareGenerator } from './middleware.generator';
import { DecoratorGenerator } from './decorator.generator';
import { ProcedureGenerator } from './procedure.generator';
import {
  TYPESCRIPT_APP_ROUTER_SOURCE_FILE,
  TYPESCRIPT_PROJECT,
} from './generator.constants';
import * as path from 'node:path';
import { TRPC_MODULE_CALLER_FILE_PATH } from '../trpc.constants';
import { FactoryModule } from '../factories/factory.module';
import { ScannerModule } from '../scanners/scanner.module';

@Module({
  imports: [FactoryModule, ScannerModule],
  providers: [
    // NestJS Providers
    ConsoleLogger,
    MetadataScanner,

    // Local Providers
    TRPCGenerator,
    RouterGenerator,
    ProcedureGenerator,
    DecoratorGenerator,
    MiddlewareGenerator,
    ContextGenerator,
    StaticGenerator,
  ],
  exports: [TRPCGenerator],
})
export class GeneratorModule {
  static forRoot(options: {
    outputDirPath?: string;
    rootModuleFilePath: string;
  }): DynamicModule {
    const defaultCompilerOptions: CompilerOptions = {
      target: ScriptTarget.ES2019,
      module: ModuleKind.CommonJS,
      emitDecoratorMetadata: true,
      experimentalDecorators: true,
      allowJs: true,
      checkJs: true,
      esModuleInterop: true,
    };
    const project = new Project({ compilerOptions: defaultCompilerOptions });

    const appRouterSourceFile = project.createSourceFile(
      path.resolve(options.outputDirPath ?? './', 'server.ts'),
      undefined,
      { overwrite: true },
    );

    return {
      module: GeneratorModule,
      providers: [
        {
          provide: TRPC_MODULE_CALLER_FILE_PATH,
          useValue: options.rootModuleFilePath,
        },
        { provide: TYPESCRIPT_PROJECT, useValue: project },
        {
          provide: TYPESCRIPT_APP_ROUTER_SOURCE_FILE,
          useValue: appRouterSourceFile,
        },
      ],
    };
  }
}
