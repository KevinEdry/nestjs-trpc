import * as path from 'node:path';
import {
  ConsoleLogger,
  Inject,
  Injectable,
  OnModuleInit,
} from '@nestjs/common';
import { Project, CompilerOptions, ScriptTarget, ModuleKind } from 'ts-morph';
import { saveOrOverrideFile } from '../utils/ts-morph.util';
import { RouterGenerator } from './router.generator';
import { SchemaImports, TRPCContext } from '../interfaces';
import { MiddlewareGenerator } from './middleware.generator';
import type { Class } from 'type-fest';
import { ContextGenerator } from './context.generator';
import { RouterFactory } from '../factories/router.factory';
import { MiddlewareFactory } from '../factories/middleware.factory';
import { ProcedureFactory } from '../factories/procedure.factory';
import { TRPC_MODULE_CALLER_FILE_PATH } from '../trpc.constants';
import { SourceFileImportsMap } from '../interfaces/generator.interface';
import { StaticGenerator } from './static.generator';
import { ImportsScanner } from '../scanners/imports.scanner';

@Injectable()
export class TRPCGenerator implements OnModuleInit {
  private project!: Project;
  private rootModuleImportsMap!: Map<string, SourceFileImportsMap>;
  private readonly APP_ROUTER_OUTPUT_FILE = 'server.ts';
  private readonly HELPER_TYPES_OUTPUT_FILE = 'index.ts';
  private readonly HELPER_TYPES_OUTPUT_PATH = path.join(__dirname, 'types');

  @Inject(TRPC_MODULE_CALLER_FILE_PATH)
  private readonly moduleCallerFilePath!: string;

  @Inject(ConsoleLogger)
  private readonly consoleLogger!: ConsoleLogger;

  @Inject(StaticGenerator)
  private readonly staticGenerator!: StaticGenerator;

  @Inject(MiddlewareGenerator)
  private readonly middlewareHandler!: MiddlewareGenerator;

  @Inject(ContextGenerator)
  private readonly contextHandler!: ContextGenerator;

  @Inject(RouterGenerator)
  private readonly serializerHandler!: RouterGenerator;

  @Inject(RouterFactory)
  private readonly routerFactory!: RouterFactory;

  @Inject(ProcedureFactory)
  private readonly procedureFactory!: ProcedureFactory;

  @Inject(MiddlewareFactory)
  private readonly middlewareFactory!: MiddlewareFactory;

  @Inject(ImportsScanner)
  private readonly importsScanner!: ImportsScanner;

  onModuleInit() {
    const defaultCompilerOptions: CompilerOptions = {
      target: ScriptTarget.ES2019,
      module: ModuleKind.CommonJS,
      emitDecoratorMetadata: true,
      experimentalDecorators: true,
      allowJs: true,
      checkJs: true,
      esModuleInterop: true,
    };

    this.project = new Project({ compilerOptions: defaultCompilerOptions });
    this.rootModuleImportsMap = this.buildRootImportsMap();
  }

  public async generateSchemaFile(
    outputDirPath: string,
    schemaImports?: Array<SchemaImports> | undefined,
  ): Promise<void> {
    try {
      const routers = this.routerFactory.getRouters();
      const mappedRoutesAndProcedures = routers.map((route) => {
        const { instance, name, alias, path } = route;
        const prototype = Object.getPrototypeOf(instance);
        const procedures = this.procedureFactory.getProcedures(
          instance,
          prototype,
        );

        return { name, path, alias, instance: { ...route }, procedures };
      });

      const appRouterSourceFile = this.project.createSourceFile(
        path.resolve(outputDirPath, this.APP_ROUTER_OUTPUT_FILE),
        undefined,
        { overwrite: true },
      );

      this.staticGenerator.generateStaticDeclaration(appRouterSourceFile);

      if (schemaImports != null && schemaImports.length > 0) {
        const schemaImportNames = schemaImports.map(
          (schemaImport) => (schemaImport as any).name,
        );
        this.staticGenerator.addSchemaImports(
          appRouterSourceFile,
          schemaImportNames,
          this.rootModuleImportsMap,
        );
      }

      const routersMetadata = this.serializerHandler.serializeRouters(
        mappedRoutesAndProcedures,
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
    } catch (error: unknown) {
      this.consoleLogger.warn('TRPC Generator encountered an error.', error);
    }
  }

  public async generateHelpersFile(
    context?: Class<TRPCContext>,
  ): Promise<void> {
    try {
      const middlewares = this.middlewareFactory.getMiddlewares();
      const helperTypesSourceFile = this.project.createSourceFile(
        path.resolve(
          this.HELPER_TYPES_OUTPUT_PATH,
          this.HELPER_TYPES_OUTPUT_FILE,
        ),
        undefined,
        { overwrite: true },
      );

      if (context != null) {
        const contextImport = this.rootModuleImportsMap.get(context.name);

        if (contextImport == null) {
          throw new Error('Could not find context import declaration.');
        }

        const contextType = await this.contextHandler.getContextInterface(
          contextImport.sourceFile,
          context,
        );

        helperTypesSourceFile.addTypeAlias({
          isExported: true,
          name: 'Context',
          type: contextType ?? '{}',
        });
      }

      for (const middleware of middlewares) {
        const middlewareInterface =
          await this.middlewareHandler.getMiddlewareInterface(
            middleware.path,
            middleware.instance,
            this.project,
          );

        if (middlewareInterface != null) {
          helperTypesSourceFile.addInterface({
            isExported: true,
            name: `${middlewareInterface.name}Context`,
            extends: ['Context'],
            properties: middlewareInterface.properties,
          });
        }
      }

      await saveOrOverrideFile(helperTypesSourceFile);

      this.consoleLogger.log(
        `Helper types has been updated successfully at "nestjs-trpc/types".`,
        'TRPC Generator',
      );
    } catch (e: unknown) {
      this.consoleLogger.warn('TRPC Generator encountered an error.', e);
    }
  }

  private buildRootImportsMap(): Map<string, SourceFileImportsMap> {
    const rootModuleSourceFile = this.project.addSourceFileAtPathIfExists(
      this.moduleCallerFilePath,
    );

    if (rootModuleSourceFile == null) {
      throw new Error('Could not access root module file.');
    }

    return this.importsScanner.buildSourceFileImportsMap(
      rootModuleSourceFile,
      this.project,
    );
  }
}
