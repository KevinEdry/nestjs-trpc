export type ProcedureOptions = {
  ctx: unknown;
  input: unknown;
  type: string;
  path: string;
  rawInput: unknown;
  signal: AbortSignal | undefined;
};
