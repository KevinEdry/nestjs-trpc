import { ConsoleLogger, Module } from '@nestjs/common';
import { MetadataScanner } from '@nestjs/core';
import { TRPCFactory } from './trpc.factory';
import { RouterFactory } from './router.factory';
import { ProcedureFactory } from './procedure.factory';
import { MiddlewareFactory } from './middleware.factory';

@Module({
  imports: [],
  providers: [
    // NestJS Providers
    ConsoleLogger,
    MetadataScanner,

    // Local Providers
    TRPCFactory,
    RouterFactory,
    ProcedureFactory,
    MiddlewareFactory,
  ],
  exports: [TRPCFactory, RouterFactory, ProcedureFactory, MiddlewareFactory],
})
export class FactoryModule {}
