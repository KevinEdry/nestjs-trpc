import { Module } from '@nestjs/common';
import { UserRouter } from './user.router';
import { TRPCModule } from 'nestjs-trpc';
import { UserService } from './user.service';
import { CatsController } from './user.controller';
import { ProtectedProcedure } from './protected.procedure';

@Module({
  imports: [
    TRPCModule.forRoot({
      autoSchemaFile: './src/@generated',
    }),
  ],
  controllers: [CatsController],
  providers: [UserRouter, UserService, ProtectedProcedure],
})
export class AppModule {}
