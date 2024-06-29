import { applyDecorators, SetMetadata } from '@nestjs/common';
import { ROUTER_METADATA_KEY } from '../trpc.constants';

// TODO: Add router alias.
export function Router(context?, metadata?) {
  return applyDecorators(
    ...[SetMetadata(ROUTER_METADATA_KEY, { context, metadata })],
  );
}
