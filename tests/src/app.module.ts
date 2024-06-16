import { Module } from '@nestjs/common';
import { UserRouter } from './user.router';
import { TrpcModule } from 'nestjs-trpc';
import { UserService } from './user.service';

@Module({
  imports: [TrpcModule.forRoot({ autoRouterFile: './src/@generated' })],
  controllers: [],
  providers: [UserRouter, UserService],
})
export class AppModule {}
