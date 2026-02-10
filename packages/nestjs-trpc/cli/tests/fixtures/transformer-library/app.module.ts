import { Module } from '@nestjs/common';
import { TRPCModule } from 'nestjs-trpc';
import superjson from 'superjson';

@Module({
    imports: [
        TRPCModule.forRoot({
            autoSchemaFile: './src/@generated',
            transformer: superjson,
        }),
    ],
})
export class AppModule {}
