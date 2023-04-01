export interface TrpcDriver<TOptions = any> {
  start(options: TOptions): Promise<unknown>;
  stop(): Promise<void>;
}
