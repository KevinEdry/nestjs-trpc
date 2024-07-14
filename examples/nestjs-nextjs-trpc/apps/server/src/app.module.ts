import { Module } from '@nestjs/common';
import { AppService } from './app.service';
import { TRPCModule } from 'nestjs-trpc';
import { UserRouter } from './user.router';

@Module({
  imports: [
    TRPCModule.forRoot({
      autoSchemaFile: './src/@generated',
    }),
  ],
  controllers: [],
  providers: [AppService, UserRouter],
})
export class AppModule {}
