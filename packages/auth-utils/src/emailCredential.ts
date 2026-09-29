/**
 * 이메일·비밀번호 인증의 **판정 규칙 정본** — 화면과 서버가 같은 함수를 쓴다
 *
 * WO-O4O-EMAIL-PASSWORD-AUTH-INTRODUCTION-V1 §2-2
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 왜 한 곳인가
 *
 *   규칙이 두 벌이면 한쪽이 뒤처진다. 화면이 통과시킨 비밀번호를 서버가 거절하거나,
 *   서버만 아는 정규화 규칙 때문에 "이미 가입된 이메일" 판정이 화면과 어긋난다.
 *   그래서 정규화 · 정책 · 마스킹 세 가지를 이 파일에만 둔다.
 *
 *   ⚠️ 옛 password policy(`WO-O4O-PASSWORD-COMPLEXITY-POLICY-UNIFY-V1`)를 되살린 것이
 *   아니다. 그것은 은퇴했고, 여기 규칙은 이 WO 에서 새로 확정한 것이다 —
 *   **8자 이상 · 영문자 ≥1 · 숫자 ≥1 · 특수기호 ≥1.** 대문자/소문자를 각각 요구하지 않으며
 *   주기적 변경 의무도 없다.
 */

/** 로그인 아이디로 쓰는 이메일의 정규화 — 조회 · 중복 판정 · 저장이 모두 이 결과를 쓴다. */
export function normalizeLoginEmail(input: string | null | undefined): string {
  return (input ?? '').trim().toLowerCase();
}

/**
 * 형태 검사(존재 확인이 아니다). 로컬파트 · 도메인 · TLD 가 있고 공백이 없는지만 본다.
 * 정규식을 최소로 유지한다 — 과한 패턴은 정상 주소를 거절하는 쪽으로 틀린다.
 */
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

/** 비밀번호 정책 — 화면 안내 문구와 서버 거절 사유가 같은 목록에서 나온다. */
export const PASSWORD_POLICY = Object.freeze({
  minLength: 8,
  requireLetter: true,
  requireDigit: true,
  requireSymbol: true,
  /** 대문자/소문자를 **각각** 요구하지 않는다 (이 WO 의 확정 사항). */
  requireBothCases: false,
});

export type PasswordViolation = 'too_short' | 'no_letter' | 'no_digit' | 'no_symbol';

/** 위반 목록. 빈 배열 = 통과. 무엇이 부족한지 화면이 그대로 안내할 수 있다. */
export function checkPasswordPolicy(password: string | null | undefined): PasswordViolation[] {
  const value = password ?? '';
  const violations: PasswordViolation[] = [];
  if (value.length < PASSWORD_POLICY.minLength) violations.push('too_short');
  if (!/[A-Za-z]/.test(value)) violations.push('no_letter');
  if (!/[0-9]/.test(value)) violations.push('no_digit');
  // 영문자 · 숫자 · 공백이 아닌 나머지를 특수기호로 본다 — 허용 기호 목록을 좁히면
  // 사용자가 쓴 정상 기호를 거절하는 쪽으로 틀린다.
  if (!/[^A-Za-z0-9\s]/.test(value)) violations.push('no_symbol');
  return violations;
}

export function isPasswordPolicyMet(password: string | null | undefined): boolean {
  return checkPasswordPolicy(password).length === 0;
}

export const PASSWORD_POLICY_MESSAGES: Readonly<Record<PasswordViolation, string>> = Object.freeze({
  too_short: '8자 이상이어야 합니다.',
  no_letter: '영문자를 1개 이상 포함해야 합니다.',
  no_digit: '숫자를 1개 이상 포함해야 합니다.',
  no_symbol: '특수기호를 1개 이상 포함해야 합니다.',
});

/** 화면 안내 한 줄 — 서버 거절 사유와 같은 규칙에서 만든다. */
export const PASSWORD_POLICY_HINT = '8자 이상 · 영문자 · 숫자 · 특수기호를 각각 1개 이상 포함';

/**
 * 아이디 찾기의 **가린 힌트** — 전체 주소를 노출하지 않는다.
 *   로컬파트 첫 1자 + `***`, 도메인 첫 1자 + `***` + 마지막 TLD.
 *   예: `renagang21@gmail.com` → `r***@g***.com`
 *
 * ⚠️ 이 함수는 **가입 여부를 숨기지 못한다** — 힌트가 나온다는 사실 자체가 단서다.
 *   그 한계는 WO §2-3 에 적혀 있고, 완화에는 휴대전화 본인 인증(후속 범위)이 필요하다.
 *   호출부는 불일치 · 다중 계정에서 **이 함수를 부르지 않고** 일반 안내를 돌려줘야 한다.
 */
export function maskLoginEmail(input: string | null | undefined): string {
  const email = normalizeLoginEmail(input);
  if (!isLoginEmailShapeValid(email)) return '';
  const at = email.indexOf('@');
  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  const lastDot = domain.lastIndexOf('.');
  const domainHead = domain.slice(0, lastDot);
  const tld = domain.slice(lastDot); // '.' 포함
  return `${local[0]}***@${domainHead[0]}***${tld}`;
}
