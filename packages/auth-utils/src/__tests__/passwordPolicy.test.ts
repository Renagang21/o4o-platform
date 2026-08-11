/**
 * WO-O4O-PASSWORD-COMPLEXITY-POLICY-UNIFY-V1
 *
 * 프런트 공용 검증의 판정 케이스 테이블.
 * 백엔드 정본(`apps/api-server/src/utils/password-policy.ts`) 테스트와
 * **동일한 케이스 목록**으로 계약을 고정한다. 케이스를 한쪽만 바꾸지 않는다.
 */
import { describe, it, expect } from 'vitest';
import { checkPasswordPolicy, isPasswordPolicyCompliant, PASSWORD_MIN_LENGTH, PASSWORD_POLICY_RULES } from '../passwordPolicy.js';

/** 백엔드 테스트와 공유하는 케이스 테이블 (동일 내용을 양쪽에 둔다) */
export const POLICY_CASES: ReadonlyArray<{ label: string; password: string; valid: boolean }> = [
  { label: '영문만', password: 'abcdefghij', valid: false },
  { label: '숫자만', password: '1234567890', valid: false },
  { label: '영문+숫자 8자 이상', password: 'abcd1234', valid: true },
  { label: '영문+숫자+특수문자', password: 'abcd1234!', valid: true },
  { label: '8자 미만(영문+숫자)', password: 'abc1234', valid: false },
  { label: '정확히 8자 경계값', password: 'abcdefg1', valid: true },
  { label: '특수문자만', password: '!!!!!!!!', valid: false },
  { label: '한글+숫자 — 한글은 영문 조건을 대신 충족하지 않는다', password: '가나다라마바사1', valid: false },
  { label: '한글+영문+숫자', password: '가나다라마바a1', valid: true },
  { label: '빈 문자열', password: '', valid: false },
];

describe('checkPasswordPolicy — 8자 + 영문 + 숫자 (특수문자 선택)', () => {
  it.each(POLICY_CASES)('$label → $valid', ({ password, valid }) => {
    expect(checkPasswordPolicy(password).valid).toBe(valid);
    expect(isPasswordPolicyCompliant(password)).toBe(valid);
  });

  it('개별 항목 판정을 분리해 반환한다', () => {
    expect(checkPasswordPolicy('abc1')).toEqual({ minLength: false, letter: true, number: true, valid: false });
    expect(checkPasswordPolicy('abcdefgh')).toEqual({ minLength: true, letter: true, number: false, valid: false });
    expect(checkPasswordPolicy('12345678')).toEqual({ minLength: true, letter: false, number: true, valid: false });
  });

  it('최소 길이는 8자다', () => {
    expect(PASSWORD_MIN_LENGTH).toBe(8);
  });

  it('체크리스트 UI 규칙에 특수문자 항목이 없다', () => {
    expect(PASSWORD_POLICY_RULES.map((r) => r.key)).toEqual(['minLength', 'letter', 'number']);
  });
});
