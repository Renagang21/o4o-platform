/**
 * WO-O4O-PASSWORD-COMPLEXITY-POLICY-UNIFY-V1
 *
 * 비밀번호 정책 정본 + 이를 소비하는 백엔드 진입점(회원가입 DTO · 재설정 DTO ·
 * 본인 변경 라우트 validator)이 **같은 판정**을 하는지 고정한다.
 *
 * 케이스 테이블은 프런트 공용 검증 테스트
 * (`packages/auth-utils/src/__tests__/passwordPolicy.test.ts`) 와 동일하다.
 * 프런트·백엔드가 하나의 파일을 참조하지 않는 대신 이 테이블로 계약을 고정하므로,
 * 한쪽만 수정하지 않는다.
 */
import 'reflect-metadata';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { validationResult } from 'express-validator';
import {
  isPasswordPolicyCompliant,
  passwordPolicyBodyValidator,
  PASSWORD_MIN_LENGTH,
  PASSWORD_POLICY_REGEX,
} from '../password-policy.js';
import { RegisterRequestDto } from '../../modules/auth/dto/register.dto.js';
import { PasswordResetDto } from '../../modules/auth/dto/password.dto.js';

/** 프런트 테스트와 공유하는 케이스 테이블 */
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

async function hasPasswordError(dto: object, field: string): Promise<boolean> {
  const errors = await validate(dto as any);
  return errors.some((e) => e.property === field);
}

describe('비밀번호 정책 정본', () => {
  it('최소 길이는 8자다', () => {
    expect(PASSWORD_MIN_LENGTH).toBe(8);
  });

  it.each(POLICY_CASES)('$label → $valid', ({ password, valid }) => {
    expect(isPasswordPolicyCompliant(password)).toBe(valid);
  });

  it('정규식은 길이를 검사하지 않는다 (길이는 별도 검사)', () => {
    expect(PASSWORD_POLICY_REGEX.test('a1')).toBe(true);
    expect(isPasswordPolicyCompliant('a1')).toBe(false);
  });

  it('문자열이 아니면 거절한다', () => {
    expect(isPasswordPolicyCompliant(undefined)).toBe(false);
    expect(isPasswordPolicyCompliant(12345678)).toBe(false);
  });
});

describe('회원가입 DTO (RegisterRequestDto)', () => {
  it.each(POLICY_CASES)('password $label → 통과 $valid', async ({ password, valid }) => {
    const dto = plainToInstance(RegisterRequestDto, { email: 'a@b.com', password });
    expect(await hasPasswordError(dto, 'password')).toBe(!valid);
  });

  it('servicePassword 에도 동일 정책이 적용된다', async () => {
    const bad = plainToInstance(RegisterRequestDto, { email: 'a@b.com', password: 'abcd1234', servicePassword: 'abcdefgh' });
    expect(await hasPasswordError(bad, 'servicePassword')).toBe(true);

    const ok = plainToInstance(RegisterRequestDto, { email: 'a@b.com', password: 'abcd1234', servicePassword: 'abcd1234' });
    expect(await hasPasswordError(ok, 'servicePassword')).toBe(false);
  });

  it('특수문자는 더 이상 필수가 아니다 (이전 정책 회귀 방지)', async () => {
    const dto = plainToInstance(RegisterRequestDto, { email: 'a@b.com', password: 'abcd1234' });
    expect(await hasPasswordError(dto, 'password')).toBe(false);
  });
});

describe('비밀번호 재설정 DTO (PasswordResetDto)', () => {
  it.each(POLICY_CASES)('password $label → 통과 $valid', async ({ password, valid }) => {
    const dto = plainToInstance(PasswordResetDto, { token: 't', password });
    expect(await hasPasswordError(dto, 'password')).toBe(!valid);
  });
});

/**
 * 본인 비밀번호 변경(`PUT /api/v1/users/password`) · 관리자 사용자 생성이 사용하는
 * 공용 express-validator 체인. 라우트가 이 체인을 그대로 소비한다.
 */
describe('express-validator 공용 체인 (본인 변경 · 사용자 생성)', () => {
  async function runChain(password: unknown): Promise<boolean> {
    const req: any = { body: { newPassword: password }, cookies: {}, headers: {}, params: {}, query: {} };
    await passwordPolicyBodyValidator('newPassword').run(req);
    return validationResult(req).isEmpty();
  }

  it.each(POLICY_CASES)('newPassword $label → 통과 $valid', async ({ password, valid }) => {
    expect(await runChain(password)).toBe(valid);
  });

  it('문자열이 아니면 거절한다', async () => {
    expect(await runChain(12345678)).toBe(false);
    expect(await runChain(undefined)).toBe(false);
  });
});
