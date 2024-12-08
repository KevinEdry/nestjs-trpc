import { Project, SourceFile } from 'ts-morph';
import { findClassInPath } from '../find-class-in-path';

describe('find-class-in-path', () => {
  let project: Project;
  const routerName = "TestRouter"
  const routerFileName = "test.router.ts"
  let routerSourceFile: SourceFile;
  const decoratorFileName = "test.decorator.ts"
  let decoratorSourceFile: SourceFile;

  beforeEach(async () => {
    project = new Project();

    decoratorSourceFile = project.createSourceFile(decoratorFileName,
      `
        import { applyDecorators } from '@nestjs/common';
        import { UseMiddlewares, Router } from 'nestjs-trpc';
        import { Middleware1, Middleware2 } from "./middlewares;

        export const MyCustomRoute = (options: { alias: string }) => {
          return applyDecorators(
            Router({ alias: options.alias }),
            UseMiddlewares(Middleware1, Middleware2),
          );
        };
      `, { overwrite: true });

    routerSourceFile = project.createSourceFile(
      routerFileName,
      `
        @MyCustomRoute({ alias: 'classTest' })
        export class ${routerName} {}
      `, { overwrite: true }
    );
  });

  it('should return undefined when path is empty', () => {
    expect(findClassInPath(project, [], "SomeClass")).toBeUndefined();
  });

  it('should return undefined when the path has no classes', () => {
    const path = [decoratorFileName]
    jest.spyOn(project, 'addSourceFileAtPath').mockReturnValueOnce(decoratorSourceFile);

    const foundClass = findClassInPath(project, path, routerName);
    expect(foundClass).toBeUndefined();
  });

  it('should return a class at start of the path call stack', () => {
    const path = [routerFileName]
    jest.spyOn(project, 'addSourceFileAtPath').mockReturnValueOnce(routerSourceFile);

    const foundClass = findClassInPath(project, path, routerName);
    expect(foundClass).toBeDefined()
    expect(foundClass?.classDeclaration).toBeDefined()
    expect(foundClass?.sourceFile).toEqual(routerSourceFile)
  });

  it('should return a class that is further down the path call stack', () => {
    const path = [decoratorFileName, routerFileName]
    jest.spyOn(project, 'addSourceFileAtPath').mockReturnValueOnce(decoratorSourceFile);
    jest.spyOn(project, 'addSourceFileAtPath').mockReturnValueOnce(routerSourceFile);

    const foundClass = findClassInPath(project, path, routerName);
    expect(foundClass).toBeDefined()
    expect(foundClass?.classDeclaration).toBeDefined()
    expect(foundClass?.sourceFile).toEqual(routerSourceFile)
    expect(foundClass?.sourceFile.getFilePath()).not.toContain(decoratorFileName);
    expect(foundClass?.sourceFile.getFilePath()).toContain(routerFileName);
  });

});