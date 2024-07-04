import { applyDecorators, SetMetadata } from '@nestjs/common';
import { ROUTER_METADATA_KEY } from '../trpc.constants';


/**
 *
 * TODO: Add router alias.
 * TODO: Add documentation
 *
 * @param context
 * @param metadata
 * @constructor
 */
export function Router(context?, metadata?) {
  return applyDecorators(
    ...[SetMetadata(ROUTER_METADATA_KEY, { context, metadata })],
  );
}
