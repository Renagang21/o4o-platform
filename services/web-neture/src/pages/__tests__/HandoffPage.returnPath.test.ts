import { expect, it } from 'vitest';
import { resolveReturnTo as neture } from '../HandoffPage';
import { resolveReturnTo as branch } from '../../../../web-kpa-branch/src/pages/HandoffPage';
import { resolveReturnTo as store } from '../../../../web-store/src/pages/HandoffPage';

it.each([neture, branch, store])('인계 화면은 제어문자·외부 주소를 거절하고 내부 경로를 유지한다', (resolve) => {
  for (const input of ['https://outside.example/', '//outside.example/', '/\t/outside.example/', '/\n/outside.example/', '/\r/outside.example/', '/\\outside.example/']) expect(resolve(input)).toBe('/');
  expect(resolve('/store?tab=products#details')).toBe('/store?tab=products#details');
});
