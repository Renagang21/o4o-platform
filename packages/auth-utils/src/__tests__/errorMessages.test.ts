/**
 * WO-O4O-AUTH-ACCOUNT-STATUS-UX-AND-PH-MOBILE-LOGOUT-CLOSURE-V1
 *
 * 로그인 차단 안내 문구 계약을 고정한다.
 * 백엔드는 `code: 'ACCOUNT_NOT_ACTIVE'` 를 유지한 채 `accountStatus` 라벨만 덧붙이므로,
 * **구분은 전적으로 이 공통 계층에서** 이뤄진다(서비스별 문자열 분기 금지).
 */
import { describe, it, expect } from 'vitest';
import { resolveAuthError, ACCOUNT_STATUS_MESSAGES, AUTH_ERROR_MESSAGES } from '../errorMessages.js';

describe('resolveAuthError — 계정 상태 구분', () => {
  it('rejected 와 suspended 는 서로 다른 문구가 된다', () => {
    const rejected = resolveAuthError({ code: 'ACCOUNT_NOT_ACTIVE', accountStatus: 'rejected' }, 403);
    const suspended = resolveAuthError({ code: 'ACCOUNT_NOT_ACTIVE', accountStatus: 'suspended' }, 403);
    expect(rejected).toBe(ACCOUNT_STATUS_MESSAGES.rejected);
    expect(suspended).toBe(ACCOUNT_STATUS_MESSAGES.suspended);
    expect(rejected).not.toBe(suspended);
  });

  it('반려 안내는 "승인 대기" 로 오표기되지 않는다', () => {
    expect(ACCOUNT_STATUS_MESSAGES.rejected).not.toContain('승인 대기');
    expect(AUTH_ERROR_MESSAGES.ACCOUNT_NOT_ACTIVE).not.toContain('승인 대기');
  });

  it('상태 라벨이 없으면(미지·legacy 값) 중립 fallback 을 쓴다', () => {
    expect(resolveAuthError({ code: 'ACCOUNT_NOT_ACTIVE' }, 403)).toBe(
      AUTH_ERROR_MESSAGES.ACCOUNT_NOT_ACTIVE,
    );
    // 화이트리스트 밖 값이 어쩌다 오더라도 임의 문구를 만들지 않는다.
    expect(resolveAuthError({ code: 'ACCOUNT_NOT_ACTIVE', accountStatus: 'deleted' }, 403)).toBe(
      AUTH_ERROR_MESSAGES.ACCOUNT_NOT_ACTIVE,
    );
  });

  it('기존 코드 기반 분기는 그대로 동작한다', () => {
    expect(resolveAuthError({ code: 'INVALID_CREDENTIALS' }, 401)).toBe(
      AUTH_ERROR_MESSAGES.INVALID_CREDENTIALS,
    );
    expect(resolveAuthError({ code: 'SERVICE_NOT_MEMBER' }, 401)).toBe(
      AUTH_ERROR_MESSAGES.SERVICE_NOT_MEMBER,
    );
    expect(resolveAuthError({}, 429)).toContain('너무 많습니다');
  });
});
