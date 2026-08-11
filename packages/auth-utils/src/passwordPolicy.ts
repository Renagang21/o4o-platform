/**
 * 비밀번호 정책 — 프런트 공용 검증
 *
 * WO-O4O-PASSWORD-COMPLEXITY-POLICY-UNIFY-V1
 *
 * 정책 (백엔드 정본 `apps/api-server/src/utils/password-policy.ts` 와 동일):
 *   - 최소 8자
 *   - 영문(A–Z / a–z) 1자 이상
 *   - 숫자 1자 이상
 *   - 특수문자는 허용하되 필수 아님
 *
 * 프런트·백엔드가 하나의 파일을 참조하도록 새 의존 구조를 만들지 않는다.
 * 대신 양쪽이 동일한 판정 케이스 테이블로 계약을 고정한다.
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

/** 체크리스트 UI 용 — 표시 순서 고정 */
export const PASSWORD_POLICY_RULES: ReadonlyArray<{
  key: keyof Omit<PasswordPolicyResult, 'valid'>;
  label: string;
}> = [
  { key: 'minLength', label: `${PASSWORD_MIN_LENGTH}자 이상` },
  { key: 'letter', label: '영문 포함' },
  { key: 'number', label: '숫자 포함' },
];

/** 입력 안내 · 오류 문구 정본 */
export const PASSWORD_POLICY_HINT = `영문, 숫자 포함 ${PASSWORD_MIN_LENGTH}자 이상`;
export const PASSWORD_POLICY_MESSAGE =
  `비밀번호는 ${PASSWORD_MIN_LENGTH}자 이상이며 영문과 숫자를 각각 1자 이상 포함해야 합니다.`;
