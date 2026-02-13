import { Module } from '@nestjs/common';
import { UserRouter } from './user.router';
import { EventRouter } from './event.router';
import { TRPCModule } from 'nestjs-trpc';
import { UserService } from './user.service';
import { ProtectedMiddleware } from './protected.middleware';
import { RolesMiddleware } from './roles.middleware';
import { AppContext } from './app.context';
import { AppErrorHandler } from './app.error-handler';
import { TrpcPanelController } from './trpc-panel.controller';
import { LoggingMiddleware } from './logging.middleware';

@Module({
  imports: [
    TRPCModule.forRoot({
      context: AppContext,
      onError: AppErrorHandler,
      globalMiddlewares: [LoggingMiddleware],
    }),
  ],
  controllers: [TrpcPanelController],
  providers: [
    UserRouter,
    EventRouter,
    AppContext,
    AppErrorHandler,
    UserService,
    ProtectedMiddleware,
    RolesMiddleware,
    LoggingMiddleware,
  ],
})
export class AppModule {}
