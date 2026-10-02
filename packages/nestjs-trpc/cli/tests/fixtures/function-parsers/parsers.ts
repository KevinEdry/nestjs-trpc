export function syncParse<T>(schema: { parse: (value: unknown) => T }) {
  return (value: unknown): T => schema.parse(value);
}

export const syncParseArrow =
  <T,>(schema: { parse: (value: unknown) => T }) =>
  (value: unknown): T =>
    schema.parse(value);

export function parseId(value: unknown) {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error('Expected a non-empty id');
  }
  return value;
}
