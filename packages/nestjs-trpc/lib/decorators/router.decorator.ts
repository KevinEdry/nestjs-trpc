import { applyDecorators, SetMetadata } from '@nestjs/common';

export const Router = () => {
  applyDecorators(...[SetMetadata('bla', 'bla')]);
};
