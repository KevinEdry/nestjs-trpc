import { Module } from '@nestjs/common';
import { TRPCModule } from 'nestjs-trpc';
import { customTransformer } from './my-transformer';

@Module({
    imports: [
        TRPCModule.forRoot({
            autoSchemaFile: './src/@generated',
            transformer: customTransformer,
        }),
    ],
})
export class AppModule {}
