import {
  ProcedureParamDecorator,
  ProcedureParamDecoratorType,
} from '../interfaces/factory.interface';
import { PROCEDURE_PARAM_METADATA_KEY } from '../trpc.constants';

/**
 * Raw Input procedure parameter decorator. Extracts the `rawInput` parameter out of the procedure `opts`.
 *
 * @see [Parameter Decorators](https://www.nestjs-trpc.io/docs/routers#parameter-decorators)
 *
 * @publicApi
 */
export function RawInput(): ParameterDecorator {
  return (
    target: Object,
    propertyKey: string | symbol,
    parameterIndex: number,
  ) => {
    const existingParams: Array<ProcedureParamDecorator> =
      Reflect.getMetadata(PROCEDURE_PARAM_METADATA_KEY, target, propertyKey) ||
      [];

    const procedureParamMetadata: ProcedureParamDecorator = {
      type: ProcedureParamDecoratorType.RawInput,
      index: parameterIndex,
    };
    existingParams.push(procedureParamMetadata);
    Reflect.defineMetadata(
      PROCEDURE_PARAM_METADATA_KEY,
      existingParams,
      target,
      propertyKey,
    );
  };
}
