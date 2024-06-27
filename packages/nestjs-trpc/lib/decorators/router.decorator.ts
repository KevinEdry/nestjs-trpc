import { applyDecorators, SetMetadata, Type } from '@nestjs/common';
import { ROUTER_METADATA_KEY } from '../trpc.constants';
import { isFunction, isString } from '@nestjs/common/utils/shared.utils';
import { FlatOverwrite } from '@trpc/server';

// TODO: Add router alias.
export function Router(context?, metadata?) {
  return applyDecorators(
    ...[SetMetadata(ROUTER_METADATA_KEY, { context, metadata })],
  );
}
