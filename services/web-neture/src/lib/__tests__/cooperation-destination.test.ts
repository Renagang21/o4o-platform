import { expect, it } from 'vitest';
import { cooperationDestination } from '@o4o/shared-space-ui';
it('routes each model to its own service without implying approval', () => {
  expect(cooperationDestination('carepharm', 'participation')).toEqual({ serviceKey: 'neture', origin: 'https://carepharm.neture.co.kr', returnPath: '/my/participation' });
  expect(cooperationDestination('carepharm', 'community').returnPath).toBe('/communities/business%3Acarepharm/forum');
  expect(cooperationDestination('pharmacy', 'participation').origin).toBe('https://pharmacy.neture.co.kr');
});
it('preserves unconfigured businesses through the existing workspace and encodes their keys', () => {
  expect(cooperationDestination('other/key', 'participation').returnPath).toBe('/businesses/other%2Fkey/participation');
  expect(cooperationDestination('toString', 'community').origin).toBe('https://pharmacy.neture.co.kr');
});
