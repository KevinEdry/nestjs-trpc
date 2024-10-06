import {
  ClassDeclaration,
  MethodDeclaration,
  Type,
  SyntaxKind,
  SourceFile,
} from 'ts-morph';
import { Injectable } from '@nestjs/common';
import type { TRPCContext } from '../interfaces';
import type { Class } from 'type-fest';

@Injectable()
export class ContextGenerator {
  public async getContextInterface(
    sourceFile: SourceFile,
    context: Class<TRPCContext>,
  ): Promise<string | null> {
    const className = context?.name;
    if (!className) {
      return null;
    }

    const contextInstance = new context();

    if (typeof contextInstance.create !== 'function') {
      return null;
    }

    const classDeclaration = this.getClassDeclaration(sourceFile, context.name);

    if (!classDeclaration) {
      return null;
    }

    const createMethod = classDeclaration.getMethod('create');
    if (!createMethod) {
      return null;
    }

    const ctxType = this.extractReturnTypeFromCreateMethod(createMethod);
    if (!ctxType) {
      return null;
    }

    return ctxType.getText();
  }

  private extractReturnTypeFromCreateMethod(
    createMethod: MethodDeclaration,
  ): Type | null {
    const body = createMethod.getBody();
    if (!body) return null;

    // Find the return statement
    const returnStatement = body
      .getDescendantsOfKind(SyntaxKind.ReturnStatement)
      .find((statement) => statement.getExpression() !== undefined);

    if (!returnStatement) return null;

    const returnExpression = returnStatement.getExpression();
    if (!returnExpression) return null;

    // Get the type of the returned expression
    const returnType = returnExpression.getType();

    // Check if the type is a Promise
    if (this.isPromiseType(returnType)) {
      // Get the type argument of the Promise
      const typeArguments = returnType.getTypeArguments();
      return typeArguments.length > 0 ? typeArguments[0] : null;
    }

    return returnType;
  }

  private isPromiseType(type: Type): boolean {
    return (
      type.getSymbol()?.getName() === 'Promise' ||
      type.getSymbol()?.getName() === '__global.Promise' ||
      type.getText().startsWith('Promise<')
    );
  }

  private getClassDeclaration(
    sourceFile: SourceFile,
    className: string,
  ): ClassDeclaration | undefined {
    const classDeclaration = sourceFile.getClass(className);
    if (classDeclaration) {
      return classDeclaration;
    }
    return undefined;
  }
}
