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
import { Inject, Injectable } from '@nestjs/common';
import { camelCase } from 'lodash';
import { ProcedureGenerator } from './procedure.generator';

@Injectable()
export class RouterGenerator {
  @Inject(DecoratorGenerator)
  private readonly decoratorHandler!: DecoratorGenerator;

  @Inject(ProcedureGenerator)
  private readonly procedureGenerator!: ProcedureGenerator;

  public serializeRouters(
    routers: Array<RoutersFactoryMetadata>,
    project: Project,
  ): Array<RouterGeneratorMetadata> {
    return routers.map((router) => {
      const proceduresMetadata = router.procedures.map((procedure) =>
        this.serializeRouterProcedures(
          router.path,
          procedure,
          router.name,
          project,
        ),
      );

      return {
        name: router.name,
        alias: router.alias,
        procedures: proceduresMetadata,
      };
    });
  }

  private serializeRouterProcedures(
    routerFilePath: string,
    procedure: ProcedureFactoryMetadata,
    routerName: string,
    project: Project,
  ): ProcedureGeneratorMetadata {
    const sourceFile = project.addSourceFileAtPath(routerFilePath);
    const classDeclaration = sourceFile.getClass(routerName);

    if (!classDeclaration) {
      throw new Error(`Could not find router ${routerName} class declaration.`);
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

    const serializedDecorators =
      this.decoratorHandler.serializeProcedureDecorators(
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
          .map(this.procedureGenerator.generateProcedureString)
          .join(',\n')} })`;
      })
      .join(',\n');
  }
}
