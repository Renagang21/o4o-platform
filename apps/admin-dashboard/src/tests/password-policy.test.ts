/**
 * admin-dashboard 비밀번호 정책 — `최소 8자 + 영문 1자 + 숫자 1자`
 *
 * 원본: WO-O4O-CENTRAL-OPERATORS-PASSWORD-POLICY-UX-ALIGNMENT-V1 (`/operators` 3경로 고정)
 * 현행: WO-O4O-ADMIN-OPERATOR-GOOGLE-INVITATION-AND-ASSIGNMENT-CUTOVER-V1 §17 로
 *       `/operators` 의 비밀번호 3경로가 **전부 은퇴**했다(운영자 인증 = Google 하나).
 *       그래서 OperatorsPage 소스 배선 검증은 여기서 제거했다 —
 *       "비밀번호 표면이 0 이다" 는 `operator-role-catalog.test.ts` 가 대신 고정한다.
 *
 * 정책 모듈 자체는 남은 소비처(`pages/users/UserForm.tsx` — 플랫폼 사용자 폼)가 있으므로
 * 판정 로직과 문구 파생은 그대로 고정한다. 백엔드 정본과 케이스 목록을 공유한다.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  checkPasswordPolicy,
  isPasswordPolicyCompliant,
  PASSWORD_MIN_LENGTH,
  PASSWORD_POLICY_HINT,
  PASSWORD_POLICY_MESSAGE,
} from '../lib/password-policy';

/** 남은 소비처. 이 화면이 사라지면 정책 모듈도 함께 처분 대상이 된다. */
const USER_FORM = readFileSync(
  resolve(__dirname, '../pages/users/UserForm.tsx'),
  'utf-8',
);

/**
 * 백엔드 정본(`apps/api-server/src/utils/__tests__/password-policy.test.ts`) ·
 * 프런트 공용(`packages/auth-utils`) 테스트와 **동일한 케이스 목록**이다.
 * 한쪽만 바꾸지 않는다.
 */
const POLICY_CASES: ReadonlyArray<{ label: string; password: string; valid: boolean }> = [
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

describe('admin-dashboard 로컬 비밀번호 정책 — 8자 + 영문 + 숫자', () => {
  it('최소 길이는 8자다', () => {
    expect(PASSWORD_MIN_LENGTH).toBe(8);
  });

  it.each(POLICY_CASES)('$label → $valid', ({ password, valid }) => {
    expect(checkPasswordPolicy(password).valid).toBe(valid);
    expect(isPasswordPolicyCompliant(password)).toBe(valid);
  });

  it('개별 조건을 분리해서 보고한다(안내 문구 근거)', () => {
    expect(checkPasswordPolicy('abc1')).toEqual({ minLength: false, letter: true, number: true, valid: false });
    expect(checkPasswordPolicy('abcdefgh')).toEqual({ minLength: true, letter: true, number: false, valid: false });
    expect(checkPasswordPolicy('12345678')).toEqual({ minLength: true, letter: false, number: true, valid: false });
  });

  it('안내·오류 문구가 정책 값에서 파생된다', () => {
    expect(PASSWORD_POLICY_HINT).toContain('영문');
    expect(PASSWORD_POLICY_HINT).toContain('숫자');
    expect(PASSWORD_POLICY_HINT).toContain(String(PASSWORD_MIN_LENGTH));
    expect(PASSWORD_POLICY_MESSAGE).toContain(String(PASSWORD_MIN_LENGTH));
    expect(PASSWORD_POLICY_MESSAGE).toContain('영문');
    expect(PASSWORD_POLICY_MESSAGE).toContain('숫자');
  });
});

describe('UserForm — 정책 모듈을 그대로 쓴다', () => {
  it('공용 패키지 의존을 늘리지 않는다(로컬 검증 사용)', () => {
    expect(USER_FORM).not.toMatch(/from '@o4o\/auth-utils'/);
    expect(USER_FORM).toMatch(/from '@\/lib\/password-policy'/);
  });

  it('길이만 보는 검증이 아니라 정책 판정을 쓴다', () => {
    expect(USER_FORM).not.toMatch(/password\.length\s*<\s*8/);
    expect(USER_FORM).toMatch(/isPasswordPolicyCompliant/);
  });

  it('오류 문구를 정책 정본에서 가져온다', () => {
    expect(USER_FORM).toMatch(/PASSWORD_POLICY_MESSAGE/);
    expect(USER_FORM).not.toMatch(/비밀번호는 최소 8자 이상이어야 합니다/);
  });
});
