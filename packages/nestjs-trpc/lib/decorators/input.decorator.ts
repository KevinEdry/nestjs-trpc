import { createParamDecorator, ExecutionContext } from '@nestjs/common';



export const Input = createParamDecorator(
  (_: unknown, ctx: ExecutionContext) => {
    return 'bla';
  },
);
