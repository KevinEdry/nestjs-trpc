import { Module } from '@nestjs/common';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { TRPCModule } from 'nestjs-trpc';

@Module({
  imports: [
    ConfigModule.forRoot(),
    TRPCModule.forRoot({
      autoSchemaFile: './src/@generated',
    }),
  ],
  controllers: [],
  providers: [AppService],
})
export class AppModule {}
