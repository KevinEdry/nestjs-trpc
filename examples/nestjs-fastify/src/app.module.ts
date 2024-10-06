import { Module } from '@nestjs/common';
import { UserRouter } from './user.router';
import { TRPCModule } from 'nestjs-trpc';
import { UserService } from './user.service';
import { ProtectedMiddleware } from './protected.middleware';
import { AppContext } from './app.context';
import { TrpcPanelController } from './trpc-panel.controller';
import { LoggingMiddleware } from './logging.middleware';

@Module({
  imports: [
    TRPCModule.forRoot({
      autoSchemaFile: './src/@generated',
      context: AppContext,
    }),
  ],
  controllers: [TrpcPanelController],
  providers: [
    UserRouter,
    AppContext,
    UserService,
    ProtectedMiddleware,
    LoggingMiddleware,
  ],
})
export class AppModule {}
