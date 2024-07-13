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
import { TRPCContext, TRPCMiddleware } from './interfaces';
import { MiddlewareHandler } from './handlers/middleware.handler';
import type { Class } from 'type-fest';
import { ContextHandler } from './handlers/context.handler';

// TODO - Change "handlers" and "Generator" folder and naming scheme to "compilers".
@Injectable()
export class TRPCGenerator implements OnModuleInit {
  private project: Project;
  private readonly APP_ROUTER_OUTPUT_FILE = 'server.ts';
  private readonly HELPER_TYPES_OUTPUT_FILE = 'index.ts';
  private readonly HELPER_TYPES_OUTPUT_PATH = path.join(__dirname, 'types');

  constructor(
    @Inject(ConsoleLogger) private readonly consoleLogger: ConsoleLogger,
    @Inject(MiddlewareHandler)
    private readonly middlewareHandler: MiddlewareHandler,
    @Inject(ContextHandler)
    private readonly contextHandler: ContextHandler,
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

  public async generateSchemaFile(
    routers: RoutersFactoryMetadata[],
    outputDirPath: string,
  ): Promise<void> {
    try {
      const appRouterSourceFile = this.project.createSourceFile(
        path.resolve(outputDirPath, this.APP_ROUTER_OUTPUT_FILE),
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

      this.consoleLogger.log(
        `AppRouter has been updated successfully at "${outputDirPath}/${this.APP_ROUTER_OUTPUT_FILE}".`,
        'TRPC Generator',
      );
    } catch (e: unknown) {
      console.error(e);
      this.consoleLogger.warn('TRPC Generator encountered an error.', e);
    }
  }

  public async generateHelpersFile(resources: {
    middlewares: Array<Class<TRPCMiddleware>>;
    context?: Class<TRPCContext>;
  }): Promise<void> {
    try {
      const { middlewares, context } = resources;

      const helperTypesSourceFile = this.project.createSourceFile(
        path.resolve(
          this.HELPER_TYPES_OUTPUT_PATH,
          this.HELPER_TYPES_OUTPUT_FILE,
        ),
        undefined,
        { overwrite: true },
      );

      const contextType = await this.contextHandler.getContextInterface(
        context,
        this.project,
      );

      helperTypesSourceFile.addTypeAlias({
        isExported: true,
        name: 'Context',
        type: contextType ?? '{}',
      });

      for (const middleware of middlewares) {
        const middlewareInterface =
          await this.middlewareHandler.getMiddlewareInterface(
            middleware,
            this.project,
          );

        helperTypesSourceFile.addInterface({
          isExported: true,
          name: `${middlewareInterface.name}Context`,
          extends: ['Context'],
          properties: middlewareInterface.properties,
        });
      }

      await saveOrOverrideFile(helperTypesSourceFile);

      this.consoleLogger.log(
        `Helper types has been updated successfully at "nestjs-trpc/types".`,
        'TRPC Generator',
      );
    } catch (e: unknown) {
      console.error(e);
      this.consoleLogger.warn('TRPC Generator encountered an error.', e);
    }
  }
}
