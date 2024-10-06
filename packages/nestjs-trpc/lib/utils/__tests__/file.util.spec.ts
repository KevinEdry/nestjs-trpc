// file: file.util.spec.ts

import { Project, SourceFile } from 'ts-morph';
import { generateStaticDeclaration, saveOrOverrideFile, getDecoratorPropertyValue } from '../ts-morph.util';
import { SourceFileImportsMap } from '../../interfaces/generator.interface';
import * as typeUtil from '../type.util';

describe('File Util', () => {
  let project: Project;
  let sourceFile: SourceFile;

  beforeEach(() => {
    project = new Project();
    sourceFile = project.createSourceFile('test.ts', '');
  });

  describe('generateStaticDeclaration', () => {
    it('should add correct import declarations and variable statements', () => {
      generateStaticDeclaration(sourceFile);

      const imports = sourceFile.getImportDeclarations();
      expect(imports).toHaveLength(2);
      expect(imports[0].getModuleSpecifierValue()).toBe('@trpc/server');
      expect(imports[1].getModuleSpecifierValue()).toBe('zod');

      const variables = sourceFile.getVariableStatements();
      expect(variables).toHaveLength(2);
      expect(variables[0].getDeclarations()[0].getName()).toBe('t');
      expect(variables[1].getDeclarations()[0].getName()).toBe('publicProcedure');
    });
  });

  describe('saveOrOverrideFile', () => {
    it('should format and save the file', async () => {
      const formatSpy = jest.spyOn(sourceFile, 'formatText');
      const saveSpy = jest.spyOn(sourceFile, 'save').mockResolvedValue();

      await saveOrOverrideFile(sourceFile);

      expect(formatSpy).toHaveBeenCalledWith({ indentSize: 2 });
      expect(saveSpy).toHaveBeenCalled();
    });
  });

  describe('getDecoratorPropertyValue', () => {
    it('should return property value from decorator', () => {
      sourceFile.addStatements(`
        import { z } from 'zod';
        const MyDecorator = (options: { input: z.ZodType }) => {};
        @MyDecorator({ input: z.string() })
        class TestClass {}
      `);

      const testClass = sourceFile.getClassOrThrow('TestClass');
      const decorator = testClass.getDecorators()[0];

      const importsMap = new Map<string, SourceFileImportsMap>();
      
      jest.spyOn(typeUtil, 'flattenZodSchema').mockReturnValue('z.string()');

      const result = getDecoratorPropertyValue(decorator, 'input', sourceFile, importsMap);
      expect(result).toBe('z.string()');
    });

    it('should return null if property is not found', () => {
      sourceFile.addStatements(`
        const MyDecorator = () => {};
        @MyDecorator()
        class TestClass {}
      `);

      const testClass = sourceFile.getClassOrThrow('TestClass');
      const decorator = testClass.getDecorators()[0];

      const importsMap = new Map<string, SourceFileImportsMap>();

      const result = getDecoratorPropertyValue(decorator, 'input', sourceFile, importsMap);
      expect(result).toBeNull();
    });
  });
});