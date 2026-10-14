import { timingSafeEqual } from 'node:crypto';
export function hasBearer(value: string | undefined, secret: string) {
  const actual = Buffer.from(value || ''); const expected = Buffer.from(`Bearer ${secret}`);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
