/**
 * Admin Password Reset Scope — 관리자 비밀번호 재설정의 실제 적용 범위 판정 (read-only)
 *
 * WO-O4O-ADMIN-PASSWORD-RESET-SERVICE-CREDENTIAL-SCOPE-CLARIFY-V1
 * 근거: CHECK-O4O-AUTH-SERVICEKEY-LOGIN-INVALID-CREDENTIALS-P0-V1 §5-1 / §8 결정 A
 *       (선행 정본 CHECK-O4O-IDENTITY-V2-SERVICE-CREDENTIAL-PASSWORD-HASH-DRIFT-AUDIT-V1 §4-1)
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 문제
 *   관리자 재설정 경로는 `users.password`(Identity V2 L1) 만 갱신한다.
 *   그런데 로그인은 `serviceKey` 가 있고 해당 `service_credentials` row 가 존재하면
 *   **`users.password` 를 보지 않는다**(auth-login.service.ts — `targetHash = credentialHash ?? user.password`).
 *   → 관리자는 성공 응답을 받지만, credential 을 가진 서비스의 로그인 비밀번호는 **바뀌지 않는다**.
 *     관리자도 사용자도 그 사실을 알 수 없는 **사일런트 무효**다.
 *
 * 결정 A (확정)
 *   서비스별 자격 분리(L1/L2)는 의도된 보안 경계이므로 **유지**한다.
 *   따라서 이 모듈은 credential 을 **변경하지 않는다** — 어떤 서비스가 영향을 받지 않는지
 *   **알려주기만** 한다.
 *
 * 계약
 *   - **read-only.** SELECT 만 수행한다. credential 생성·수정·삭제 경로를 만들지 않는다.
 *   - 비밀번호·해시를 반환하지 않는다. serviceKey 목록만 반환한다.
 *   - 조회 실패는 던지지 않는다 — 재설정 자체는 이미 성공했으므로 안내 누락으로 격하한다
 *     (안내를 못 만들었다고 200 을 500 으로 바꾸지 않는다).
 */

import { AppDataSource } from '../../database/connection.js';
import { ServiceCredential } from '../../modules/auth/entities/ServiceCredential.js';
import logger from '../../utils/logger.js';

export interface AdminPasswordResetScope {
  /** 관리자 재설정이 실제로 적용된 계층. 항상 L1(users.password). */
  updatedLayer: 'platform_identity';
  /**
   * 이 서비스들의 **로그인 비밀번호는 바뀌지 않았다** (service_credentials 보유).
   * 빈 배열이면 모든 서비스가 users.password 로 로그인하므로 재설정이 전 서비스에 적용된다.
   */
  unaffectedServiceKeys: string[];
  /** 관리자에게 보여줄 안내. 영향받지 않는 서비스가 없으면 null. */
  notice: string | null;
}

const FULLY_APPLIED: AdminPasswordResetScope = {
  updatedLayer: 'platform_identity',
  unaffectedServiceKeys: [],
  notice: null,
};

/**
 * 대상 사용자가 service_credential 을 가진 serviceKey 목록을 조회해 안내를 만든다.
 *
 * @param userId 재설정 대상 사용자 id
 * @returns 적용 범위. 조회 실패 시 안내 없는 기본값(재설정 결과 자체에는 영향 없음).
 */
export async function resolveAdminPasswordResetScope(
  userId: string,
): Promise<AdminPasswordResetScope> {
  if (!userId) return FULLY_APPLIED;

  try {
    const repo = AppDataSource.getRepository(ServiceCredential);
    const rows = await repo.find({
      where: { userId },
      select: { serviceKey: true },
      order: { serviceKey: 'ASC' },
    });

    const keys = rows.map((r) => r.serviceKey).filter(Boolean);
    if (keys.length === 0) return FULLY_APPLIED;

    return {
      updatedLayer: 'platform_identity',
      unaffectedServiceKeys: keys,
      notice:
        `이 계정은 서비스별 로그인 비밀번호를 따로 사용합니다(${keys.join(', ')}). ` +
        `해당 서비스의 로그인 비밀번호는 이번 재설정으로 변경되지 않습니다. ` +
        `사용자가 각 서비스의 "비밀번호 찾기"로 직접 재설정해야 합니다.`,
    };
  } catch (error) {
    // 안내 생성 실패가 재설정 성공 응답을 뒤집지 않는다.
    logger.warn('[admin-password-reset-scope] scope 조회 실패 — 안내 생략', {
      userId,
      error: (error as Error)?.message,
    });
    return FULLY_APPLIED;
  }
}
