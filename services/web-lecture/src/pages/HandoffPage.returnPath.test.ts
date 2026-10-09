import { expect, it } from 'vitest';
import { resolveReturnTo } from './HandoffPage';

it.each([null, 'https://outside.example/', '//outside.example/', '/\\outside.example/', '/\t/outside.example/', '/\n/outside.example/', '/\r/outside.example/'])('외부 주소와 브라우저 정규화로 외부 주소가 되는 입력을 거절한다: %s', (input) => {
  expect(resolveReturnTo(input)).toBe('/');
});
it('서비스 내부 경로와 검색·앵커는 유지한다', () => {
  expect(resolveReturnTo('/courses/example?view=lesson#content')).toBe('/courses/example?view=lesson#content');
});
