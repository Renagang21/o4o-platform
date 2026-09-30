/**
 * 휴대전화 형태 판정 — 아이디 찾기 · 가입의 대조 키 (WO-O4O-EMAIL-PASSWORD-AUTH-INTRODUCTION-V1 §2-3)
 *
 * 이메일·비밀번호 판정 규칙(정규화 · 정책 · 마스킹)은 `@o4o/auth-utils` 가 정본이다.
 * 휴대전화는 그 규칙에 속하지 않아 서버에 둔다. 본인 인증이 아니다.
 */

/** 숫자만 남긴다. */
export function normalizePhoneDigits(input: string | null | undefined): string {
  return (input ?? '').replace(/\D/g, '');
}

/** 국내 휴대전화 형태(01로 시작 · 10~11자리). 존재 확인이 아니다. */
export function isPhoneShapeValid(input: string | null | undefined): boolean {
  return /^01\d{8,9}$/.test(normalizePhoneDigits(input));
}
