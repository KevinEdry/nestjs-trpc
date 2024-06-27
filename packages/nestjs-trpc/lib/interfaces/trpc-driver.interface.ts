export interface TRPCDriver<TOptions = any> {
  start(options: TOptions): Promise<unknown>;
  stop(): Promise<void>;
}
