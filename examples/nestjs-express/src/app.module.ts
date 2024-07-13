import { Module } from '@nestjs/common';
import { UserRouter } from './user.router';
import { TRPCModule } from 'nestjs-trpc';
import { UserService } from './user.service';
import { CatsController } from './user.controller';
import { ProtectedMiddleware } from './protected.middleware';
import * as trpcExpress from '@trpc/server/adapters/express';

@Module({
  imports: [
    TRPCModule.forRoot({
      autoSchemaFile: './src/@generated',
      createContext(opts: trpcExpress.CreateExpressContextOptions) {
        return {
          bla: true,
          auth: {
            user: 'asfasdf',
          },
        };
      },
    }),
  ],
  controllers: [CatsController],
  providers: [UserRouter, UserService, ProtectedMiddleware],
})
export class AppModule {}
