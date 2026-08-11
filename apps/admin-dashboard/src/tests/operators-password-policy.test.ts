/**
 * WO-O4O-CENTRAL-OPERATORS-PASSWORD-POLICY-UX-ALIGNMENT-V1
 *
 * 중앙 관리자 `/operators` 의 비밀번호 3경로가 확정 정책
 * `최소 8자 + 영문 1자 + 숫자 1자` 로 통일되어 있는지 고정한다.
 *
 *   1) 신규 계정 최초 서비스 비밀번호
 *   2) 기존 계정의 초기 서비스 비밀번호(선택 입력)
 *   3) 서비스 비밀번호 변경 모달
 *
 * 판정 로직은 `@/lib/password-policy` 로컬 모듈로 검증하고,
 * 화면 배선(placeholder · 오류 문구 · 제출 가능 조건)은 기존 admin-dashboard 테스트와 같은
 * **소스 계약 검증** 방식으로 고정한다.
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

const SRC = readFileSync(
  resolve(__dirname, '../pages/operators/OperatorsPage.tsx'),
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

  it('공용 패키지 의존을 늘리지 않는다(로컬 검증 사용)', () => {
    expect(SRC).not.toMatch(/from '@o4o\/auth-utils'/);
    expect(SRC).toMatch(/from '@\/lib\/password-policy'/);
  });
});

describe('OperatorsPage — 비밀번호 3경로 정책 배선', () => {
  it('길이만 보는 검증(length < 8)이 남아 있지 않다', () => {
    expect(SRC).not.toMatch(/password\.length\s*<\s*8/);
    expect(SRC).not.toMatch(/pwValue\.length\s*<\s*8/);
  });

  it('"최소 8자 이상" 만 안내하는 낡은 문구가 남아 있지 않다', () => {
    expect(SRC).not.toMatch(/비밀번호는 최소 8자 이상이어야 합니다/);
    expect(SRC).not.toMatch(/초기 서비스 비밀번호는 최소 8자 이상이어야 합니다/);
    expect(SRC).not.toMatch(/placeholder="8자 이상"/);
  });

  it('(1) 신규 계정 최초 비밀번호를 정책으로 검증한다', () => {
    expect(SRC).toMatch(
      /if \(!formData\.password\) errors\.password = '신규 등록에는 최초 서비스 비밀번호가 필요합니다\.';/,
    );
    expect(SRC).toMatch(
      /else if \(!isPasswordPolicyCompliant\(formData\.password\)\) errors\.password = PASSWORD_POLICY_MESSAGE;/,
    );
  });

  it('(2) 기존 계정의 초기 비밀번호는 입력했을 때만 같은 정책을 적용한다', () => {
    expect(SRC).toMatch(
      /if \(formData\.password && !isPasswordPolicyCompliant\(formData\.password\)\) \{/,
    );
  });

  it('(3) 서비스 비밀번호 변경 모달이 정책으로 검증하고 같은 문구를 쓴다', () => {
    expect(SRC).toMatch(/if \(!isPasswordPolicyCompliant\(pwValue\)\) \{\s*\n\s*setPwError\(PASSWORD_POLICY_MESSAGE\);/);
  });

  it('제출 가능 조건이 정책 충족과 일치한다', () => {
    expect(SRC).toMatch(/disabled=\{pwSubmitting \|\| !isPasswordPolicyCompliant\(pwValue\)\}/);
  });

  it('placeholder 를 정책 안내 문구 정본으로 통일한다', () => {
    const placeholders = SRC.match(/placeholder=\{PASSWORD_POLICY_HINT\}/g) ?? [];
    // 입력 필드 2개(등록 폼 · 변경 모달)
    expect(placeholders.length).toBe(2);
  });

  it('두 입력 필드 모두 정책 안내 문구를 함께 보여준다', () => {
    const hints = SRC.match(/\{PASSWORD_POLICY_HINT\}/g) ?? [];
    // placeholder 2 + 보조 안내문 2
    expect(hints.length).toBeGreaterThanOrEqual(4);
  });
});
