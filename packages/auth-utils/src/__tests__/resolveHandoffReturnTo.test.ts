import { expect, it } from 'vitest';
import { resolveHandoffReturnTo, buildHandoffDestination } from '../resolveHandoffReturnTo.js';

const origin = 'https://service.example';
it.each([null, '', 'https://outside.example/', '//outside.example/', '/\\outside.example/', '/\t/outside.example/', '/\n/outside.example/', '/\r/outside.example/', '/\u007f/path'])('rejects unsafe destination %s', (raw) => {
  expect(resolveHandoffReturnTo(raw, origin)).toBe('/');
});
it('preserves internal Unicode paths, query and hash', () => {
  expect(resolveHandoffReturnTo('/약국/💊?tab=products#details', origin)).toBe('/%EC%95%BD%EA%B5%AD/%F0%9F%92%8A?tab=products#details');
});

it('builds a fixed-origin destination with service base and preserves query/hash', () => {
  expect(buildHandoffDestination('/store?tab=products#details', origin, '/kpa')).toBe(`${origin}/kpa/store?tab=products#details`);
});
it('rejects external destinations and unsafe service bases before reload', () => {
  expect(() => buildHandoffDestination('//outside.example/', origin)).toThrow();
  expect(() => buildHandoffDestination('/', origin, '//outside.example')).toThrow();
});
