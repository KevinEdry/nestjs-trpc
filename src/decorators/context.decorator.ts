import {
  ProcedureParamDecorator,
  ProcedureParamDecoratorType,
} from '../interfaces/factory.interface';
import { PROCEDURE_PARAM_METADATA_KEY } from '../trpc.constants';

export function Context(): ParameterDecorator {
  return (
    target: Object,
    propertyKey: string | symbol | undefined,
    parameterIndex?: number | TypedPropertyDescriptor<any>
  ) => {
    if (propertyKey != null && typeof parameterIndex === 'number') {
      const existingParams: Array<ProcedureParamDecorator> =
        Reflect.getMetadata(PROCEDURE_PARAM_METADATA_KEY, target, propertyKey) ||
        [];

      const procedureParamMetadata: ProcedureParamDecorator = {
        type: ProcedureParamDecoratorType.Context,
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