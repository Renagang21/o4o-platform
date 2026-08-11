/**
 * 비밀번호 정책 — admin-dashboard 로컬 검증
 *
 * WO-O4O-CENTRAL-OPERATORS-PASSWORD-POLICY-UX-ALIGNMENT-V1
 *
 * 정책 (백엔드 정본 `apps/api-server/src/utils/password-policy.ts` 와 동일):
 *   - 최소 8자
 *   - 영문(A–Z / a–z) 1자 이상
 *   - 숫자 1자 이상
 *   - 특수문자는 허용하되 필수 아님
 *
 * 왜 `@o4o/auth-utils` 를 import 하지 않는가:
 *   admin-dashboard 는 현재 `@o4o/auth-utils` 를 의존하지 않는다.
 *   이 화면 하나를 위해 workspace 의존과 lockfile 을 변경하지 않는다(WO 범위 밖).
 *   대신 판정 규칙을 그대로 옮기고, 테스트로 두 구현이 같은 케이스 테이블을 통과하도록 고정한다.
 *
 * "영문" 은 알파벳 A–Z / a–z 만을 뜻한다. 한글 등 다른 문자는 포함될 수 있으나
 * 영문 1자 조건을 대신 충족시키지 않는다.
 */

export const PASSWORD_MIN_LENGTH = 8;

export interface PasswordPolicyResult {
  /** 최소 길이 충족 */
  minLength: boolean;
  /** 영문 1자 이상 */
  letter: boolean;
  /** 숫자 1자 이상 */
  number: boolean;
  /** 전체 정책 충족 */
  valid: boolean;
}

export function checkPasswordPolicy(password: string): PasswordPolicyResult {
  const pw = typeof password === 'string' ? password : '';
  const minLength = pw.length >= PASSWORD_MIN_LENGTH;
  const letter = /[a-zA-Z]/.test(pw);
  const number = /\d/.test(pw);
  return { minLength, letter, number, valid: minLength && letter && number };
}

export function isPasswordPolicyCompliant(password: string): boolean {
  return checkPasswordPolicy(password).valid;
}

/** 입력 placeholder · 짧은 안내 문구 정본 */
export const PASSWORD_POLICY_HINT = `영문, 숫자 포함 ${PASSWORD_MIN_LENGTH}자 이상`;

/** 검증 실패 오류 문구 정본 (백엔드 PASSWORD_POLICY_MESSAGE 와 동일 문장) */
export const PASSWORD_POLICY_MESSAGE =
  `비밀번호는 ${PASSWORD_MIN_LENGTH}자 이상이며 영문과 숫자를 각각 1자 이상 포함해야 합니다.`;
