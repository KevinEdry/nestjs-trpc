import * as path from 'node:path';
import { locate } from 'func-loc';
import { ConsoleLogger, Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { Project, CompilerOptions, ScriptTarget, ModuleKind, SourceFile } from 'ts-morph';
import { RoutersFactoryMetadata } from './interfaces/factory.interface';
import { generateStaticDeclaration, saveOrOverrideFile } from './utils/file.util';
import { SerializerHandler } from './handlers/serializer.handler';

@Injectable()
export class TRPCGenerator implements OnModuleInit {
  private project: Project;
  private readonly OUTPUT_FILE_NAME = 'trpc.ts';

  constructor(
    @Inject(ConsoleLogger) private readonly consoleLogger: ConsoleLogger,
    @Inject(SerializerHandler) private readonly serializerHandler: SerializerHandler,
  ) {}

  onModuleInit() {
    const defaultCompilerOptions: CompilerOptions = {
      target: ScriptTarget.ES2019,
      module: ModuleKind.CommonJS,
      emitDecoratorMetadata: true,
      experimentalDecorators: true,
      esModuleInterop: true,
    };

    this.project = new Project({ compilerOptions: defaultCompilerOptions });
  }

  public async generate(
    routers: RoutersFactoryMetadata[],
    outputDirPath: string,
  ): Promise<void> {
    try {
      const trpcSourceFile = this.project.createSourceFile(
        path.resolve(outputDirPath, this.OUTPUT_FILE_NAME),
        undefined,
        { overwrite: true },
      );

      generateStaticDeclaration(trpcSourceFile);

      const routersMetadata = await this.serializerHandler.serializeRouters(routers);
      const routersStringDeclarations = this.serializerHandler.generateRoutersStringFromMetadata(routersMetadata);

      trpcSourceFile.addStatements(/* ts */ `
        const appRouter = t.router({${routersStringDeclarations}});
        export type AppRouter = typeof appRouter;
      `);

      await saveOrOverrideFile(trpcSourceFile);

      this.consoleLogger.log(
        `AppRouter has been updated successfully at "${outputDirPath}/${this.OUTPUT_FILE_NAME}".`,
        "TRPC Generator"
      );
    } catch (e: unknown) {
      console.error(e);
      this.consoleLogger.warn('TRPC Generator encountered an error.', e);
    }
  }
}