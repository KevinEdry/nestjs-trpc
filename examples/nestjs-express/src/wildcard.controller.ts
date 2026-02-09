import { All, Controller, Get } from '@nestjs/common';

@Controller()
export class WildcardController {
  @Get('/hello')
  getHello(): string {
    return 'Hello from NestJS!';
  }

  @All('*')
  all() {
    return 'wildcard fallback';
  }
}
