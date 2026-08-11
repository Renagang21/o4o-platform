/**
 * 비밀번호 정책 정본 (백엔드)
 *
 * WO-O4O-PASSWORD-COMPLEXITY-POLICY-UNIFY-V1
 *
 * 정책:
 *   - 최소 8자
 *   - 영문(A–Z / a–z) 1자 이상
 *   - 숫자 1자 이상
 *   - 특수문자는 **허용하되 필수 아님**
 *
 * 적용 대상: 새로 설정되는 모든 비밀번호
 *   (회원가입 · 비밀번호 재설정 · 본인 변경 · 운영자 회원 변경 · 관리자 초기 서비스 비밀번호)
 *
 * 비적용:
 *   - 로그인 검증(기존 해시 비교)은 변경하지 않는다.
 *   - 기존 비밀번호를 위한 예외 · 유예 · 강제변경 플래그 · 자동 판별 · migration 을 두지 않는다.
 *
 * "영문" 은 알파벳 A–Z / a–z 만을 뜻한다. 한글 등 다른 문자는 포함될 수 있으나
 * 영문 1자 조건을 대신 충족시키지 않는다.
 *
 * 프런트 대응 정본은 `@o4o/auth-utils` 의 `checkPasswordPolicy` 이며,
 * 두 구현은 동일한 판정 케이스 테이블로 계약을 고정한다.
 */

import { body } from 'express-validator';

export const PASSWORD_MIN_LENGTH = 8;

/** 영문 1자 이상 + 숫자 1자 이상 (길이는 별도 검사) */
export const PASSWORD_POLICY_REGEX = /^(?=.*[a-zA-Z])(?=.*\d).+$/;

export const PASSWORD_POLICY_MESSAGE =
  `비밀번호는 ${PASSWORD_MIN_LENGTH}자 이상이며 영문과 숫자를 각각 1자 이상 포함해야 합니다.`;

/** class-validator / express-validator 메시지 영문 표기 (기존 DTO 메시지 언어 유지) */
export const PASSWORD_POLICY_MESSAGE_EN =
  `Password must be at least ${PASSWORD_MIN_LENGTH} characters and contain both a letter and a number`;

export function isPasswordPolicyCompliant(password: unknown): password is string {
  if (typeof password !== 'string') return false;
  if (password.length < PASSWORD_MIN_LENGTH) return false;
  return PASSWORD_POLICY_REGEX.test(password);
}

/**
 * express-validator 공용 체인 — 새로 설정되는 비밀번호 필드에 사용한다.
 * 라우트마다 규칙을 복제하지 않기 위해 정본에서 제공한다.
 */
export function passwordPolicyBodyValidator(field: string) {
  return body(field)
    .isString()
    .isLength({ min: PASSWORD_MIN_LENGTH })
    .withMessage(PASSWORD_POLICY_MESSAGE)
    .matches(PASSWORD_POLICY_REGEX)
    .withMessage(PASSWORD_POLICY_MESSAGE);
}
