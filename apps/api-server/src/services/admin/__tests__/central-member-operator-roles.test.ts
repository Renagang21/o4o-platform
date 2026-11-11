import { currentOperatorRoles } from '../central-member-workspace.service.js';

// 2026-11-10 Codex 리뷰(#1014): 활성 이력으로 남은 퇴역 역할이 회원 목록에 현재 운영 역할처럼 보였다.
describe('회원 목록 운영 역할 표시', () => {
  it('퇴역 역할은 빼고 현재 관리자 · 운영자 역할만 남긴다', () => {
    expect(currentOperatorRoles([
      'cosmetics:admin', 'kpa:branch_operator', 'neture:operator', 'platform:admin',
      'platform:member', 'platform:super_admin', 'supplier:operator',
    ])).toEqual(['neture:operator', 'platform:super_admin', 'supplier:operator']);
  });
  it.each([undefined, null, 'platform:super_admin', [null, 1]])('배열이 아니거나 문자열이 아닌 값은 버린다 %p', input => {
    expect(currentOperatorRoles(input)).toEqual([]);
  });
});
