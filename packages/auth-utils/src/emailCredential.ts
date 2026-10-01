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
 *   **8자 이상 · UTF-8 72바이트 이하 · 영문자 ≥1 · 숫자 ≥1 · 특수기호 ≥1.**
 *   대문자/소문자를 각각 요구하지 않으며 주기적 변경 의무도 없다.
 *
 *   72바이트 상한: bcrypt 는 입력의 앞 72바이트만 본다. 상한이 없으면 앞 72바이트가 같고 끝만 다른
 *   비밀번호가 같은 비밀번호로 인증된다. 조용히 잘라 쓰지 않고 거절한다(ASCII 72자 · 한글 24자).
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
  /** UTF-8 바이트 상한 — bcrypt 가 보는 입력 한계와 같다. 글자 수가 아니라 바이트다. */
  maxBytes: 72,
  requireLetter: true,
  requireDigit: true,
  requireSymbol: true,
  /** 대문자/소문자를 **각각** 요구하지 않는다 (이 WO 의 확정 사항). */
  requireBothCases: false,
});

export type PasswordViolation = 'too_short' | 'too_long' | 'no_letter' | 'no_digit' | 'no_symbol';

/**
 * UTF-8 인코딩 바이트 수 — 브라우저와 서버가 같은 값을 내도록 직접 센다(Buffer · TextEncoder 비의존).
 * 짝이 없는 surrogate 는 인코딩 시 U+FFFD(3바이트)로 바뀌므로 3으로 센다.
 */
export function passwordUtf8ByteLength(password: string | null | undefined): number {
  const value = password ?? '';
  let bytes = 0;
  for (let i = 0; i < value.length; i++) {
    const c = value.charCodeAt(i);
    if (c < 0x80) bytes += 1;
    else if (c < 0x800) bytes += 2;
    else if (c >= 0xd800 && c <= 0xdbff && i + 1 < value.length) {
      const next = value.charCodeAt(i + 1);
      if (next >= 0xdc00 && next <= 0xdfff) {
        bytes += 4;
        i++;
      } else {
        bytes += 3;
      }
    } else {
      bytes += 3;
    }
  }
  return bytes;
}

/** 바이트 상한 검사 — 정책 검사와 저장 · 검증 경로(bcrypt 호출 전)가 함께 쓴다. */
export function isPasswordWithinByteLimit(password: string | null | undefined): boolean {
  return passwordUtf8ByteLength(password) <= PASSWORD_POLICY.maxBytes;
}

/** 위반 목록. 빈 배열 = 통과. 무엇이 부족한지 화면이 그대로 안내할 수 있다. */
export function checkPasswordPolicy(password: string | null | undefined): PasswordViolation[] {
  const value = password ?? '';
  const violations: PasswordViolation[] = [];
  if (value.length < PASSWORD_POLICY.minLength) violations.push('too_short');
  if (!isPasswordWithinByteLimit(value)) violations.push('too_long');
  if (!/[A-Za-z]/.test(value)) violations.push('no_letter');
  if (!/[0-9]/.test(value)) violations.push('no_digit');
  // 특수기호 = Unicode 문장부호(P) · 기호(S). ASCII 기호 32개가 모두 여기 속한다.
  // 한글 · 한자 등 일반 문자(L) · 숫자(N) · 공백은 특수기호가 아니다 — `abcdef1가` 는 거절된다.
  if (!/[\p{P}\p{S}]/u.test(value)) violations.push('no_symbol');
  return violations;
}

export function isPasswordPolicyMet(password: string | null | undefined): boolean {
  return checkPasswordPolicy(password).length === 0;
}

export const PASSWORD_POLICY_MESSAGES: Readonly<Record<PasswordViolation, string>> = Object.freeze({
  too_short: '8자 이상이어야 합니다.',
  too_long: '72바이트 이하여야 합니다(영문·숫자·기호 72자, 한글 24자).',
  no_letter: '영문자를 1개 이상 포함해야 합니다.',
  no_digit: '숫자를 1개 이상 포함해야 합니다.',
  no_symbol: '특수기호를 1개 이상 포함해야 합니다.',
});

/** 화면 안내 한 줄 — 서버 거절 사유와 같은 규칙에서 만든다. */
export const PASSWORD_POLICY_HINT = '8자 이상 · 영문자 · 숫자 · 특수기호를 각각 1개 이상 포함 · 72바이트 이하(한글 24자)';

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
