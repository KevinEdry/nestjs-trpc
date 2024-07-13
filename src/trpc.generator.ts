import * as path from 'node:path';
import {
  ConsoleLogger,
  Inject,
  Injectable,
  OnModuleInit,
} from '@nestjs/common';
import {
  Project,
  CompilerOptions,
  ScriptTarget,
  ModuleKind,
  SourceFile,
} from 'ts-morph';
import { RoutersFactoryMetadata } from './interfaces/factory.interface';
import {
  generateStaticDeclaration,
  saveOrOverrideFile,
} from './utils/file.util';
import { SerializerHandler } from './handlers/serializer.handler';

@Injectable()
export class TRPCGenerator implements OnModuleInit {
  private project: Project;
  private readonly APP_ROUTER_OUTPUT_FILE = 'server.ts';
  private readonly HELPER_TYPES_OUTPUT_FILE = 'helpers.ts';

  constructor(
    @Inject(ConsoleLogger) private readonly consoleLogger: ConsoleLogger,
    @Inject(SerializerHandler)
    private readonly serializerHandler: SerializerHandler,
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

  //TODO - Generate Context from the createContext method.

  public async generate(
    routers: RoutersFactoryMetadata[],
    outputDirPath: string,
  ): Promise<void> {
    try {
      const appRouterSourceFile = this.project.createSourceFile(
        path.resolve(outputDirPath, this.APP_ROUTER_OUTPUT_FILE),
        undefined,
        { overwrite: true },
      );

      const helperTypesSourceFile = this.project.createSourceFile(
        path.resolve(outputDirPath, this.HELPER_TYPES_OUTPUT_FILE),
        undefined,
        { overwrite: true },
      );

      generateStaticDeclaration(appRouterSourceFile);

      const routersMetadata = await this.serializerHandler.serializeRouters(
        routers,
        this.project,
      );
      const routersStringDeclarations =
        this.serializerHandler.generateRoutersStringFromMetadata(
          routersMetadata,
        );

      appRouterSourceFile.addStatements(/* ts */ `
        const appRouter = t.router({${routersStringDeclarations}});
        export type AppRouter = typeof appRouter;
      `);

      await saveOrOverrideFile(appRouterSourceFile);
      await saveOrOverrideFile(helperTypesSourceFile);

      this.consoleLogger.log(
        `AppRouter has been updated successfully at "${outputDirPath}/${this.APP_ROUTER_OUTPUT_FILE}".`,
        'TRPC Generator',
      );
    } catch (e: unknown) {
      console.error(e);
      this.consoleLogger.warn('TRPC Generator encountered an error.', e);
    }
  }
}
