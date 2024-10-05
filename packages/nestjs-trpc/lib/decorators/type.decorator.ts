import {
  ProcedureParamDecorator,
  ProcedureParamDecoratorType,
} from '../interfaces/factory.interface';
import { PROCEDURE_PARAM_METADATA_KEY } from '../trpc.constants';

/**
 * Type procedure parameter decorator. Extracts the `type` parameter out of the procedure `opts`.
 *
 * @see [Parameter Decorators](https://www.nestjs-trpc.io/docs/routers#parameter-decorators)
 *
 * @publicApi
 */
export function Type(): ParameterDecorator {
  return (
    target: object,
    propertyKey: string | symbol | undefined,
    parameterIndex: number,
  ) => {
    if (propertyKey != null) {
      const existingParams: Array<ProcedureParamDecorator> =
        Reflect.getMetadata(
          PROCEDURE_PARAM_METADATA_KEY,
          target,
          propertyKey,
        ) || [];

      const procedureParamMetadata: ProcedureParamDecorator = {
        type: ProcedureParamDecoratorType.Type,
        index: parameterIndex,
      };
      existingParams.push(procedureParamMetadata);
      Reflect.defineMetadata(
        PROCEDURE_PARAM_METADATA_KEY,
        existingParams,
        target,
        propertyKey,
      );
    }
  };
}
