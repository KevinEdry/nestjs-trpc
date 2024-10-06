import { applyDecorators, SetMetadata } from '@nestjs/common';
import { ROUTER_METADATA_KEY } from '../trpc.constants';
import { getCallerFilePath } from '../utils/path.utils';

/**
 * Decorator that marks a class as a TRPC router that can receive inbound
 * requests and produce responses.
 *
 * An TRPC Router responds to inbound HTTP Requests and produces HTTP Responses.
 * It defines a class that provides the context for one or more related procedures that correspond to HTTP request methods and associated routes
 * for example `Query /trpc/userRouter.getUsers`, `Mutation /trpc/userRouter.createUser`.
 *
 *
 * @param {object} args configuration object specifying:
 * - `alias` - string that defines a router alias. The alias is used both in the auto schema file generation, and for the actual api access.
 *
 * @see [Routers](https://nestjs-trpc.io/docs/routers)
 *
 * @publicApi
 */
export function Router(args?: { alias?: string }): ClassDecorator {
  const stack = new Error().stack || '';
  const stackLines = stack.split('\n');
  const callerLine = stackLines[2]; // The line of the stack trace where this decorator is used

  // Regex to extract the file path from the stack trace line
  const match = callerLine.match(/\((.*):\d+:\d+\)$/);
  const path = match ? match[1] : 'unknown';
  const newPath = getCallerFilePath();

  console.log({ originalPath: path, newPath });
  return applyDecorators(
    ...[
      SetMetadata(ROUTER_METADATA_KEY, { alias: args?.alias, path: newPath }),
    ],
  );
}
