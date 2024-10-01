import { Controller, Get, Post } from '@nestjs/common';

@Controller('cats')
export class CatsController {
  @Get()
  findAll(): string {
    return 'This action returns all cats';
  }

  @Post()
  findPAll(): string {
    return 'This action returns all cats';
  }

  @Post('bla')
  returnBla() {
    return 'This action returns all cats';
  }
}
