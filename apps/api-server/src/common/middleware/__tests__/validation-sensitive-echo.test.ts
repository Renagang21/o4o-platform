/**
 * WO-O4O-EMAIL-PASSWORD-AUTH-INTRODUCTION-V1 보완 2 — 인증 route 의 400 응답이 비밀번호 · 토큰을 되돌려 주지 않는다.
 *
 * `validateDto` 는 실패 필드의 `value` 를 `details` 에 담는다. 비밀번호 · 비밀번호 확인 · 인증 토큰은
 * DTO 검사(길이 · 타입 · 허용 필드)에서 떨어져도 그 값이 응답에 실리면 안 된다.
 * 실제 인증 route 와 같은 DTO · 같은 미들웨어로 잘못된 입력을 보내고 **응답 원문**에 표식 문자열이 없는지 본다.
 */
import 'reflect-metadata';
import express from 'express';
import request from 'supertest';
import { validateDto, formatValidationErrors } from '../validation.middleware.js';
import {
  EmailSignupRequestDto,
  EmailLoginRequestDto,
  EmailTokenRequestDto,
  PasswordResetRequestDto,
  PasswordSetRequestDto,
} from '../../../modules/auth/dto/email-auth.dto.js';
import { RefreshTokenRequestDto } from '../../../modules/auth/dto/refresh.dto.js';

const MARK = 'SECRET-MARK-9f3a';
const LONG = `${MARK}${'x'.repeat(300)}`; // MaxLength(200) 초과

function appFor(dto: unknown) {
  const app = express();
  app.use(express.json());
  app.post('/t', validateDto(dto), (_req, res) => res.status(200).json({ success: true }));
  return app;
}

const signupBase = {
  email: 'user@example.test',
  name: '홍길동',
  phone: '01012345678',
  consents: { terms: true, privacy: true },
};

describe('validateDto — 민감 필드 값 되돌림 금지', () => {
  it.each([
    ['signup · 200자 초과 password', EmailSignupRequestDto, { ...signupBase, password: LONG }, 'password'],
    ['signup · 비문자열 password', EmailSignupRequestDto, { ...signupBase, password: { v: MARK } }, 'password'],
    ['signup · 허용되지 않은 passwordConfirm', EmailSignupRequestDto, { ...signupBase, password: 'Abcd123!', passwordConfirm: MARK }, 'passwordConfirm'],
    ['login · 200자 초과 password', EmailLoginRequestDto, { email: 'user@example.test', password: LONG }, 'password'],
    ['verify · 비문자열 token', EmailTokenRequestDto, { token: [MARK] }, 'token'],
    ['reset · 200자 초과 newPassword', PasswordResetRequestDto, { token: 'tok', newPassword: LONG }, 'newPassword'],
    ['reset · 비문자열 token', PasswordResetRequestDto, { token: { v: MARK }, newPassword: 'Abcd123!' }, 'token'],
    ['set · 200자 초과 currentPassword', PasswordSetRequestDto, { currentPassword: LONG, newPassword: 'Abcd123!' }, 'currentPassword'],
    ['refresh · 비문자열 refreshToken', RefreshTokenRequestDto, { refreshToken: { v: MARK } }, 'refreshToken'],
  ])('%s → 400 · 응답에 값 없음', async (_label, dto, body, property) => {
    const res = await request(appFor(dto)).post('/t').send(body);
    expect(res.status).toBe(400);
    expect(res.text).not.toContain(MARK);
    const detail = res.body.details.find((d: { property: string }) => d.property === property);
    expect(detail).toBeDefined();
    expect(detail).not.toHaveProperty('value');
  });

  it('민감하지 않은 필드는 종전처럼 value 를 돌려준다 (진단 계약 유지)', async () => {
    const res = await request(appFor(EmailLoginRequestDto)).post('/t').send({ email: 12345, password: 'Abcd123!' });
    expect(res.status).toBe(400);
    expect(res.body.details.find((d: { property: string }) => d.property === 'email')?.value).toBe(12345);
    expect(res.text).not.toContain('Abcd123!');
  });

  it('민감하지 않은 필드 안에 중첩된 민감 키는 [REDACTED]', () => {
    const out = formatValidationErrors([
      { property: 'consents', constraints: { x: 'y' }, value: { terms: true, token: MARK }, children: [] } as any,
    ]);
    expect(JSON.stringify(out)).not.toContain(MARK);
    expect((out[0] as { value: { token: string } }).value.token).toBe('[REDACTED]');
  });
});
