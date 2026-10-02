import { z } from 'zod';

export type EncodedPreservedValue =
  | { kind: 'undefined' }
  | { kind: 'null' }
  | { kind: 'string'; value: string }
  | { kind: 'boolean'; value: boolean }
  | { kind: 'number'; value: number }
  | { kind: 'number-special'; value: 'NaN' | 'Infinity' | '-Infinity' | '-0' }
  | { kind: 'bigint'; value: string }
  | { kind: 'date'; value: string | null }
  | { kind: 'array'; value: EncodedPreservedValue[] }
  | { kind: 'object'; value: Array<{ key: string; value: EncodedPreservedValue }> }
  | { kind: 'map'; value: Array<[EncodedPreservedValue, EncodedPreservedValue]> }
  | { kind: 'set'; value: EncodedPreservedValue[] };

export const encodedPreservedValueSchema: z.ZodType<EncodedPreservedValue> = z.lazy(() => z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('undefined') }),
  z.object({ kind: z.literal('null') }),
  z.object({ kind: z.literal('string'), value: z.string() }),
  z.object({ kind: z.literal('boolean'), value: z.boolean() }),
  z.object({ kind: z.literal('number'), value: z.number().finite() }),
  z.object({ kind: z.literal('number-special'), value: z.enum(['NaN', 'Infinity', '-Infinity', '-0']) }),
  z.object({ kind: z.literal('bigint'), value: z.string().regex(/^-?\d+$/) }),
  z.object({ kind: z.literal('date'), value: z.string().datetime().nullable() }),
  z.object({ kind: z.literal('array'), value: z.array(encodedPreservedValueSchema) }),
  z.object({
    kind: z.literal('object'),
    value: z.array(z.object({ key: z.string(), value: encodedPreservedValueSchema })),
  }),
  z.object({
    kind: z.literal('map'),
    value: z.array(z.tuple([encodedPreservedValueSchema, encodedPreservedValueSchema])),
  }),
  z.object({ kind: z.literal('set'), value: z.array(encodedPreservedValueSchema) }),
])) as z.ZodType<EncodedPreservedValue>;

export function encodePreservedValue(value: unknown): EncodedPreservedValue {
  if (value === undefined) return { kind: 'undefined' };
  if (value === null) return { kind: 'null' };
  if (typeof value === 'string') return { kind: 'string', value };
  if (typeof value === 'boolean') return { kind: 'boolean', value };
  if (typeof value === 'number') {
    if (Number.isNaN(value)) return { kind: 'number-special', value: 'NaN' };
    if (value === Infinity) return { kind: 'number-special', value: 'Infinity' };
    if (value === -Infinity) return { kind: 'number-special', value: '-Infinity' };
    if (Object.is(value, -0)) return { kind: 'number-special', value: '-0' };
    return { kind: 'number', value };
  }
  if (typeof value === 'bigint') return { kind: 'bigint', value: value.toString() };
  if (value instanceof Date) {
    return { kind: 'date', value: Number.isNaN(value.getTime()) ? null : value.toISOString() };
  }
  if (Array.isArray(value)) return { kind: 'array', value: value.map(encodePreservedValue) };
  if (value instanceof Map) {
    return {
      kind: 'map',
      value: Array.from(value.entries(), ([key, entry]) => [encodePreservedValue(key), encodePreservedValue(entry)]),
    };
  }
  if (value instanceof Set) {
    return { kind: 'set', value: Array.from(value.values(), encodePreservedValue) };
  }
  if (typeof value === 'object') {
    return {
      kind: 'object',
      value: Object.entries(value as Record<string, unknown>).map(([key, entry]) => ({
        key,
        value: encodePreservedValue(entry),
      })),
    };
  }
  throw new Error('El valor preservado contiene un tipo no serializable.');
}

export function decodePreservedValue(encoded: EncodedPreservedValue): unknown {
  switch (encoded.kind) {
    case 'undefined': return undefined;
    case 'null': return null;
    case 'string': return encoded.value;
    case 'boolean': return encoded.value;
    case 'number': return encoded.value;
    case 'number-special':
      if (encoded.value === 'NaN') return Number.NaN;
      if (encoded.value === 'Infinity') return Infinity;
      if (encoded.value === '-Infinity') return -Infinity;
      return -0;
    case 'bigint': return BigInt(encoded.value);
    case 'date': return encoded.value === null ? new Date(Number.NaN) : new Date(encoded.value);
    case 'array': return encoded.value.map(decodePreservedValue);
    case 'object': return Object.fromEntries(encoded.value.map(({ key, value }) => [key, decodePreservedValue(value)]));
    case 'map': return new Map(encoded.value.map(([key, value]) => [decodePreservedValue(key), decodePreservedValue(value)]));
    case 'set': return new Set(encoded.value.map(decodePreservedValue));
  }
}
