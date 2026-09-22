/**
 * Admin Google Bootstrap — 전환기 1회용 게이트 config
 * WO-O4O-GOOGLE-IDENTITY-OPERATOR-EXPLICIT-LINK-V1 §15 (사용자 지시 2026-09-22)
 *
 * 기존 `platform:super_admin` users.id 에 검증된 Google `sub` 를 **1회** 연결하기 위한 경로의 게이트다.
 * 이 경로는 세션도 비밀번호도 요구할 수 없으므로(연결 전에는 그 계정으로 로그인할 수단이 없다),
 * **env 플래그 + 일회용 코드**로만 열린다. 둘 중 하나라도 없으면 endpoint 는 존재하지 않는 것처럼 404 로 닫힌다.
 *
 * env:
 *   `GOOGLE_ADMIN_BOOTSTRAP_ENABLED` — 정확히 `'true'` 일 때만 활성(fail-closed).
 *   `GOOGLE_ADMIN_BOOTSTRAP_CODE`    — 24자 이상 일회용 코드. repository 에 commit 하지 않는다(Cloud Run env 로만 주입).
 *
 * 운영 원칙: 연결 성공 직후 두 env 를 제거해 경로를 폐쇄한다. env 가 남아 있어도 대상 관리자에게 이미 Google 연결이
 * 있으면 서버가 `GOOGLE_ACCOUNT_ALREADY_LINKED` 로 거절하므로 재사용은 구조적으로 불가능하다(1회성 이중 보장).
 */

import { timingSafeEqual } from 'crypto';

export const GOOGLE_ADMIN_BOOTSTRAP_ENABLED_ENV = 'GOOGLE_ADMIN_BOOTSTRAP_ENABLED';
export const GOOGLE_ADMIN_BOOTSTRAP_CODE_ENV = 'GOOGLE_ADMIN_BOOTSTRAP_CODE';

/** 코드 최소 길이 — 짧은 코드로 열리는 일을 막는다(추측 저항). */
export const GOOGLE_ADMIN_BOOTSTRAP_MIN_CODE_LENGTH = 24;

/** 연결 대상 판정 기준 role — 이 role 을 가진 활성 user 가 정확히 1명일 때만 진행한다. */
export const GOOGLE_ADMIN_BOOTSTRAP_TARGET_ROLE = 'platform:super_admin';

export interface GoogleAdminBootstrapConfig {
  /** 플래그가 `'true'` 이고 충분히 긴 코드가 설정된 경우에만 true. */
  isEnabled(): boolean;
  /** 길이 정보까지 노출하지 않도록 길이 불일치도 timing-safe 비교와 같은 경로로 false 처리한다. */
  verifyCode(candidate: string | undefined): boolean;
}

export function loadGoogleAdminBootstrapConfig(env: NodeJS.ProcessEnv = process.env): GoogleAdminBootstrapConfig {
  const enabledRaw = env[GOOGLE_ADMIN_BOOTSTRAP_ENABLED_ENV]?.trim();
  const code = env[GOOGLE_ADMIN_BOOTSTRAP_CODE_ENV]?.trim() ?? '';
  const enabled = enabledRaw === 'true' && code.length >= GOOGLE_ADMIN_BOOTSTRAP_MIN_CODE_LENGTH;

  return {
    isEnabled: () => enabled,
    verifyCode: (candidate) => {
      if (!enabled) return false;
      const given = (candidate ?? '').trim();
      if (given.length !== code.length) return false;
      return timingSafeEqual(Buffer.from(given, 'utf8'), Buffer.from(code, 'utf8'));
    },
  };
}
