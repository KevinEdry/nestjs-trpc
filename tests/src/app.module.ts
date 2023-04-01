import { Module } from '@nestjs/common';
import { UserRouter } from './user.router';
import { TrpcModule } from 'nestjs-trpc';

@Module({
  imports: [TrpcModule.forRoot({ autoRouterFile: './output' })],
  controllers: [],
  providers: [UserRouter],
})
export class AppModule {}
