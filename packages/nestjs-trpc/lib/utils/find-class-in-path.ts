import { ClassDeclaration, Project, SourceFile } from 'ts-morph';

export const findClassInPath = (
  project: Project,
  path: string[],
  className: string,
):
  | { sourceFile: SourceFile; classDeclaration: ClassDeclaration }
  | undefined => {
  for (const p of path) {
    const sourceFile = project.addSourceFileAtPath(p);
    const classDeclaration = sourceFile.getClass(className);

    if (classDeclaration !== undefined) {
      return {
        sourceFile,
        classDeclaration,
      };
    }
  }

  return undefined;
};
