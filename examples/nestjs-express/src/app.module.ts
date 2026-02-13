import { Module } from '@nestjs/common';
import { UserRouter } from './user.router';
import { EventRouter } from './event.router';
import { TRPCModule } from 'nestjs-trpc';
import { UserService } from './user.service';
import { ProtectedMiddleware } from './protected.middleware';
import { AppContext } from './app.context';
import { TrpcPanelController } from './trpc-panel.controller';

@Module({
  imports: [
    TRPCModule.forRoot({
      context: AppContext,
    }),
  ],
  controllers: [TrpcPanelController],
  providers: [
    UserRouter,
    EventRouter,
    AppContext,
    UserService,
    ProtectedMiddleware,
  ],
})
export class AppModule {}
