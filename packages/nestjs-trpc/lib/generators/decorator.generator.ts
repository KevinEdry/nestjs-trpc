import { Decorator, Project, SourceFile } from 'ts-morph';
import { DecoratorGeneratorMetadata } from '../interfaces/generator.interface';
import { getDecoratorPropertyValue } from '../utils/file.util';
import { ConsoleLogger, Inject, Injectable } from '@nestjs/common';

@Injectable()
export class DecoratorGenerator {
  @Inject(ConsoleLogger)
  private readonly consoleLogger!: ConsoleLogger;

  public serializeProcedureDecorators(
    decorators: Decorator[],
    sourceFile: SourceFile,
    project: Project,
  ): Array<DecoratorGeneratorMetadata> {
    return decorators.reduce<DecoratorGeneratorMetadata[]>(
      (array, decorator) => {
        const decoratorName = decorator.getName();

        if (decoratorName === 'Query' || decoratorName === 'Mutation') {
          const input = getDecoratorPropertyValue(
            decorator,
            'input',
            sourceFile,
            project,
          );
          const output = getDecoratorPropertyValue(
            decorator,
            'output',
            sourceFile,
            project,
          );

          array.push({
            name: decoratorName,
            arguments: {
              ...(input ? { input } : {}),
              ...(output ? { output } : {}),
            },
          });
        } else if (decoratorName === 'Middlewares') {
          return array;
        } else {
          this.consoleLogger.warn(`Decorator ${decoratorName}, not supported.`);
        }

        return array;
      },
      [],
    );
  }
}
