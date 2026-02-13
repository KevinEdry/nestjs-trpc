import { Injectable, Logger } from '@nestjs/common';
import { OnErrorOptions, TRPCErrorHandler } from 'nestjs-trpc';

@Injectable()
export class AppErrorHandler implements TRPCErrorHandler {
  private readonly logger = new Logger(AppErrorHandler.name);

  onError(opts: OnErrorOptions): void {
    this.logger.error(
      `tRPC error on ${opts.path} [${opts.type}]: ${opts.error.message}`,
    );
  }
}
