import { Module } from '@nestjs/common';
import { UserRouter } from './user.router';
import { TRPCModule } from 'nestjs-trpc';
import { UserService } from './user.service';
import { ProtectedMiddleware } from './protected.middleware';
import { AppContext } from './app.context';

@Module({
  imports: [
    TRPCModule.forRoot({
      autoSchemaFile: './src/@generated',
      context: AppContext,
    }),
  ],
  providers: [UserRouter, AppContext, UserService, ProtectedMiddleware],
})
export class AppModule {}
