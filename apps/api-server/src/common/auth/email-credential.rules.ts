/**
 * 이메일·비밀번호 판정 규칙 — 서버측 거울
 *
 * WO-O4O-EMAIL-PASSWORD-AUTH-INTRODUCTION-V1 §2-2
 *
 * 정본은 `packages/auth-utils/src/emailCredential.ts` 다(화면이 쓴다). api-server 는
 * `@o4o/auth-utils` 를 의존성으로 갖고 있지 않고, 의존성 추가(package.json · lockfile ·
 * Dockerfile 선별 COPY)는 이 WO 의 중지 조건이므로 **같은 규칙을 여기 한 벌 더 두고
 * 동등성 테스트로 묶는다** — `__tests__/emailCredentialRulesParity.test.ts` 가 두 구현에
 * 같은 입력 표본을 넣어 결과가 하나라도 다르면 실패한다. 규칙을 바꿀 때는 두 파일을 같이 바꾼다.
 *
 * 의존성 추가가 승인되면 이 파일을 지우고 `@o4o/auth-utils` import 로 바꾼다.
 */

export function normalizeLoginEmail(input: string | null | undefined): string {
  return (input ?? '').trim().toLowerCase();
}

export function isLoginEmailShapeValid(input: string | null | undefined): boolean {
  const email = normalizeLoginEmail(input);
  if (email.length === 0 || email.length > 255) return false;
  if (/\s/.test(email)) return false;
  const at = email.indexOf('@');
  if (at <= 0 || at !== email.lastIndexOf('@')) return false;
  const domain = email.slice(at + 1);
  if (domain.length < 3 || !domain.includes('.')) return false;
  if (domain.startsWith('.') || domain.endsWith('.') || domain.includes('..')) return false;
  return true;
}

export type PasswordViolation = 'too_short' | 'no_letter' | 'no_digit' | 'no_symbol';

export const PASSWORD_MIN_LENGTH = 8;

export function checkPasswordPolicy(password: string | null | undefined): PasswordViolation[] {
  const value = password ?? '';
  const violations: PasswordViolation[] = [];
  if (value.length < PASSWORD_MIN_LENGTH) violations.push('too_short');
  if (!/[A-Za-z]/.test(value)) violations.push('no_letter');
  if (!/[0-9]/.test(value)) violations.push('no_digit');
  if (!/[^A-Za-z0-9\s]/.test(value)) violations.push('no_symbol');
  return violations;
}

export const PASSWORD_POLICY_MESSAGES: Readonly<Record<PasswordViolation, string>> = Object.freeze({
  too_short: '8자 이상이어야 합니다.',
  no_letter: '영문자를 1개 이상 포함해야 합니다.',
  no_digit: '숫자를 1개 이상 포함해야 합니다.',
  no_symbol: '특수기호를 1개 이상 포함해야 합니다.',
});

export function maskLoginEmail(input: string | null | undefined): string {
  const email = normalizeLoginEmail(input);
  if (!isLoginEmailShapeValid(email)) return '';
  const at = email.indexOf('@');
  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  const lastDot = domain.lastIndexOf('.');
  const domainHead = domain.slice(0, lastDot);
  const tld = domain.slice(lastDot);
  return `${local[0]}***@${domainHead[0]}***${tld}`;
}

/** 휴대전화 — 숫자만 남긴다. 아이디 찾기의 대조 키이며 본인 인증이 아니다. */
export function normalizePhoneDigits(input: string | null | undefined): string {
  return (input ?? '').replace(/\D/g, '');
}

/** 국내 휴대전화 형태(01로 시작 · 10~11자리). 존재 확인이 아니다. */
export function isPhoneShapeValid(input: string | null | undefined): boolean {
  return /^01\d{8,9}$/.test(normalizePhoneDigits(input));
}
