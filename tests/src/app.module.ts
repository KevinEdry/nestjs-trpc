import { Module } from '@nestjs/common';
import { UserRouter } from './user.router';
import { TRPCModule } from 'nestjs-trpc';
import { UserService } from './user.service';

@Module({
  imports: [TRPCModule.forRoot({ outputAppRouterFile: './src/@generated' })],
  controllers: [],
  providers: [UserRouter, UserService],
})
export class AppModule {}
