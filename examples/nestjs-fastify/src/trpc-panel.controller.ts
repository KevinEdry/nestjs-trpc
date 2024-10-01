import {
  All,
  Controller,
  Inject,
  OnModuleInit,
  Response,
} from '@nestjs/common';
import { renderTrpcPanel } from 'trpc-panel';
import type { AnyRouter } from '@trpc/server';
import { AppRouterHost } from 'nestjs-trpc';
import type { FastifyReply } from 'fastify';

@Controller()
export class TrpcPanelController implements OnModuleInit {
  private appRouter!: AnyRouter;

  constructor(
    @Inject(AppRouterHost) private readonly appRouterHost: AppRouterHost,
  ) {}

  onModuleInit() {
    this.appRouter = this.appRouterHost.appRouter;
  }

  @All('/panel')
  panel(@Response() res: FastifyReply) {
    res.type('text/html').send(
      renderTrpcPanel(this.appRouter, {
        url: 'http://localhost:8080/trpc',
      }),
    );
  }
}
