import { applyDecorators, SetMetadata } from '@nestjs/common';

export const Procedure = () => {
  applyDecorators(...[SetMetadata('query', 'query')]);
};
