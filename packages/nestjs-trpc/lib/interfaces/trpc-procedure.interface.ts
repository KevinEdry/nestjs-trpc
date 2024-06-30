export interface TRPCProcedureOptions<
  TContext = unknown,
  TRequest = unknown,
  TResponse = unknown,
  TNext = (arg: unknown) => void,
> {
  ctx: TContext;
  req: TRequest;
  res: TResponse;
  next: TNext;
}

export interface TRPCProcedure<
  TContext = unknown,
  TRequest = unknown,
  TResponse = unknown,
> {
  use(opts: TRPCProcedureOptions<TContext, TRequest, TResponse>): void;
}
