import { expect, it } from 'vitest';
import { resolveHandoffReturnTo } from '../resolveHandoffReturnTo.js';

const origin = 'https://service.example';
it.each([null, '', 'https://outside.example/', '//outside.example/', '/\\outside.example/', '/\t/outside.example/', '/\n/outside.example/', '/\r/outside.example/', '/\u007f/path'])('rejects unsafe destination %s', (raw) => {
  expect(resolveHandoffReturnTo(raw, origin)).toBe('/');
});
it('preserves internal Unicode paths, query and hash', () => {
  expect(resolveHandoffReturnTo('/약국/💊?tab=products#details', origin)).toBe('/%EC%95%BD%EA%B5%AD/%F0%9F%92%8A?tab=products#details');
});
