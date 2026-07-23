export interface TRPCSSEOptions {
  /**
   * Enable server-sent events (SSE) subscriptions
   * @default true
   */
  enabled?: boolean;
  /**
   * Keep-alive ping comments sent from the server, preventing proxies
   * from closing idle subscription streams
   */
  ping?: {
    /**
     * Enable ping comments sent from the server
     * @default false
     */
    enabled: boolean;
    /**
     * Interval in milliseconds
     * @default 1000
     */
    intervalMs?: number;
  };
  /**
   * Maximum duration in milliseconds for the request before ending the stream
   * @default undefined
   */
  maxDurationMs?: number;
  /**
   * End the request immediately after data is sent
   * Only useful for serverless runtimes that do not support streaming responses
   * @default false
   */
  emitAndEndImmediately?: boolean;
  /**
   * Client-specific options - these will be sent to the client as part of the first message
   * @default {}
   */
  client?: {
    /**
     * Timeout and reconnect after inactivity in milliseconds
     * @default undefined
     */
    reconnectAfterInactivityMs?: number;
  };
}

export interface TRPCJSONLOptions {
  /**
   * Interval in milliseconds between keep-alive pings on streamed batch
   * responses (`httpBatchStreamLink`)
   * @default undefined
   */
  pingMs?: number;
}
