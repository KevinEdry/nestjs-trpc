import { locate } from 'func-loc';
import { Project } from 'ts-morph';
import {
  RouterGeneratorMetadata,
  ProcedureGeneratorMetadata,
} from '../interfaces/generator.interface';
import {
  RoutersFactoryMetadata,
  ProcedureFactoryMetadata,
} from '../interfaces/factory.interface';
import { DecoratorGenerator } from './decorator.generator';
import { generateProcedureString } from '../utils/type.util';
import { Inject, Injectable } from '@nestjs/common';
import { camelCase } from 'lodash';

@Injectable()
export class RouterGenerator {
  @Inject(DecoratorGenerator)
  private readonly decoratorHandler!: DecoratorGenerator;

  public async serializeRouters(
    routers: RoutersFactoryMetadata[],
    project: Project,
  ): Promise<RouterGeneratorMetadata[]> {
    return await Promise.all(
      routers.map(async (router) => {
        const proceduresMetadata = await Promise.all(
          router.procedures.map(async (procedure) =>
            await this.serializeRouterProcedures(procedure, router.name, project),
          ),
        );

        return {
          name: router.name,
          alias: router.alias,
          procedures: proceduresMetadata,
        };
      }),
    );
  }

  private async serializeRouterProcedures(
    procedure: ProcedureFactoryMetadata,
    routerName: string,
    project: Project,
  ): Promise<ProcedureGeneratorMetadata> {
    const location = await locate(procedure.implementation, {
      sourceMap: true,
    });
    const sourceFile = project.addSourceFileAtPath(location.path);
    const classDeclaration = sourceFile.getClass(routerName);

    if (!classDeclaration) {
      throw new Error(
        `Could not find router ${routerName}, class declaration.`,
      );
    }

    const methodDeclaration = classDeclaration.getMethod(procedure.name);

    if (!methodDeclaration) {
      throw new Error(`Could not find ${routerName}, method declarations.`);
    }

    const decorators = methodDeclaration.getDecorators();

    if (!decorators) {
      throw new Error(
        `could not find ${methodDeclaration.getName()}, method decorators.`,
      );
    }

    const serializedDecorators = this.decoratorHandler.serializeProcedureDecorators(
      decorators,
      sourceFile,
      project,
    );

    return {
      name: procedure.name,
      decorators: serializedDecorators,
    };
  }

  public generateRoutersStringFromMetadata(
    routers: Array<RouterGeneratorMetadata>,
  ): string {
    return routers
      .map((router) => {
        const { name, procedures, alias } = router;
        return `${alias ?? camelCase(name)}: t.router({ ${procedures
          .map(generateProcedureString)
          .join(',\n')} })`;
      })
      .join(',\n');
  }
}
