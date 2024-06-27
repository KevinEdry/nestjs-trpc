import { Module } from '@nestjs/common';
import { UserRouter } from './user.router';
import { TRPCModule } from 'nestjs-trpc';
import { UserService } from './user.service';
import { TestRouter } from './test.router';

@Module({
  imports: [TRPCModule.forRoot({ outputAppRouterFile: './src/@generated' })],
  controllers: [],
  providers: [UserRouter, UserService, TestRouter],
})
export class AppModule {}
