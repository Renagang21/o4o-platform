/**
 * Account Access Policy — 제한 로그인(restricted login) 중앙 정책
 *
 * WO-O4O-RESTRICTED-LOGIN-FOR-PENDING-REJECTED-V1
 * IR: IR-O4O-NEW-USER-SERVICE-REJECTION-LOGIN-POLICY-V1 (B안)
 *
 * ── 축 정의 ────────────────────────────────────────────────────────────────
 * `accountAccess` 는 **계정 접근 상태**이지 서비스 역할이 아니다.
 *   - role_assignments 에 저장하지 않는다 (RBAC SSOT 오염 금지, F9)
 *   - service_memberships 상태와도 별개 축이다 (§6)
 *   - JWT claim 은 프론트 힌트일 뿐이고, **판정 SSOT 는 항상 DB `users.status`** 다.
 *     `requireAuth` 가 매 요청 users 를 조회하므로 claim 위조로 승격할 수 없다.
 *
 * ── 상태 매핑 (users.status enum = active|inactive|pending|approved|suspended|rejected) ──
 *   active / approved            → normal      (기존과 동일)
 *   pending                      → restricted  (본 WO 신설)
 *   inactive / suspended / rejected → blocked   (로그인·refresh·API 모두 차단)
 *
 * ── default-deny ───────────────────────────────────────────────────────────
 * restricted 계정은 **아래 allowlist 에 명시된 (METHOD, 정확한 경로)** 만 통과한다.
 * 서비스별 handler 가 각자 예외를 구현하는 방식은 금지한다 (§2.3).
 */

import { UserStatus } from '../../types/auth.js';

export type AccountAccess = 'normal' | 'restricted';

/** 로그인/토큰 발급 자체가 불가한 상태를 포함한 3분기 판정 결과 */
export type AccountAccessDecision = AccountAccess | 'blocked';

export const ACCOUNT_ACCESS_RESTRICTED_CODE = 'ACCOUNT_ACCESS_RESTRICTED';
export const ACCOUNT_ACCESS_RESTRICTED_MESSAGE = '가입 승인 상태를 확인한 뒤 이용할 수 있습니다.';

/**
 * users.status → 계정 접근 상태.
 *
 * fail closed: 알 수 없는 값은 'blocked' 로 판정한다 (§7.3).
 */
export function resolveAccountAccess(status: unknown): AccountAccessDecision {
  switch (status) {
    case UserStatus.ACTIVE:
    case UserStatus.APPROVED:
      return 'normal';
    case UserStatus.PENDING:
      return 'restricted';
    case UserStatus.INACTIVE:
    case UserStatus.SUSPENDED:
    case UserStatus.REJECTED:
      return 'blocked';
    default:
      // 프로덕션 users.status 에는 TS enum 에 없는 legacy 값 'deleted' 가 실재한다
      // (2026-07-31 실측 19 rows, 전부 isActive=false). 아래 fail-closed 로 차단된다.
      return 'blocked';
  }
}

/**
 * restricted 계정에게 허용되는 최소 경로.
 *
 * 원칙 (§5-C):
 *   - HTTP method 까지 구분한다
 *   - path prefix 매칭을 쓰지 않는다 (정확 일치만)
 *   - `/:id` 등 임의 자원 경로를 열지 않는다
 *   - query 값으로 허용 범위를 넓히지 않는다 (query 는 판정에서 제거된다)
 *
 * 실제 존재하는 경로만 등록한다. Neture 는 서비스 전용 가입상태 API 가 없어
 * 공통 `/api/v1/auth/me` · `/api/v1/auth/services` 로 대체한다 (CHECK §서비스별 상태 확인).
 */
export const RESTRICTED_ALLOWLIST: ReadonlySet<string> = new Set([
  // ── 공통 인증 (로그인 세션 유지 / 로그아웃 / 본인 최소 정보) ──
  'GET /api/v1/auth/me',
  'GET /api/v1/auth/verify',
  'GET /api/v1/auth/status',
  'POST /api/v1/auth/logout',
  'POST /api/v1/auth/logout-all',
  // 이메일 인증 재발송 — 인증 완료가 pending 해소 경로 중 하나다 (§2.4)
  'POST /api/v1/auth/resend-verification',
  // 내 service membership 상태 목록 (본인 것만 반환)
  'GET /api/v1/auth/services',

  // ── 서비스별 가입 상태 · 반려 사유 조회 (§2.4 / §5-E) ──
  'GET /api/v1/pharmacy-hub/join/status',
  'GET /api/v1/pharmacy-hub/me/access',
  'GET /api/v1/kpa/me/membership',
  'GET /api/v1/glycopharm/members/me',
  'GET /api/v1/cosmetics/members/me',
]);

/**
 * 경로 정규화 — allowlist 우회 시도를 차단한다.
 *
 * 차단 대상 (§11.7):
 *   - query 조작:            `/api/v1/x?foo=/api/v1/auth/me`  → query 제거 후 판정
 *   - path 유사 문자열:       `/api/v1/auth/me/../../orders`   → '..' 세그먼트는 즉시 거부
 *   - 인코딩 우회:            `/api/v1/auth/%6de`              → 1회 디코드 후 판정, 실패 시 거부
 *   - 중복 슬래시 / 후행 슬래시: `//api/v1//auth/me/`            → 정규화 후 판정
 *
 * @returns 정규화된 경로, 또는 판정 불가/위험 시 null (호출측은 null 을 차단으로 처리)
 */
export function normalizeRequestPath(rawUrl: string | undefined): string | null {
  if (typeof rawUrl !== 'string' || rawUrl.length === 0) return null;

  // query / fragment 제거
  let path = rawUrl.split('?')[0].split('#')[0];

  // percent-encoding 1회 디코드 (malformed 는 거부)
  if (path.includes('%')) {
    try {
      path = decodeURIComponent(path);
    } catch {
      return null;
    }
    // 디코드 후에도 인코딩이 남아 있으면 다중 인코딩 우회 시도로 보고 거부
    if (path.includes('%')) return null;
  }

  // 제어문자 / 널바이트 / 역슬래시 거부
  if (/[\u0000-\u001f\u007f\\]/.test(path)) return null;

  // 중복 슬래시 축약
  path = path.replace(/\/{2,}/g, '/');

  // 상대 경로 세그먼트 거부 (정규화하지 않고 거부한다 — 의도된 요청이 아니다)
  const segments = path.split('/');
  if (segments.some((s) => s === '.' || s === '..')) return null;

  // 후행 슬래시 제거 (root 제외)
  if (path.length > 1 && path.endsWith('/')) path = path.slice(0, -1);

  if (!path.startsWith('/')) return null;
  return path;
}

/**
 * restricted 계정의 요청이 허용되는가.
 *
 * fail closed: method/경로 판정이 불가능하면 false (§7.3).
 */
export function isRestrictedRequestAllowed(
  method: string | undefined,
  rawUrl: string | undefined,
): boolean {
  const path = normalizeRequestPath(rawUrl);
  if (!path) return false;

  const verb = typeof method === 'string' ? method.toUpperCase() : '';
  if (!verb) return false;

  return RESTRICTED_ALLOWLIST.has(`${verb} ${path}`);
}

/**
 * restricted 계정 응답 정규화 (§5-D).
 *
 * DB 에 role_assignments 가 잔존하는 비정상 데이터가 있어도 **restricted 상태가 우선**한다.
 * 프론트가 role 기반으로 진입점을 그리는 것을 막기 위해 role/scope/permission 계열을
 * 빈 값으로 강제한다. (실제 차단은 프론트가 아니라 중앙 가드가 담당한다 — §7.1)
 *
 * membership 은 **본인 가입 상태 확인이 제한 로그인의 목적**이므로 유지한다.
 */
export function projectRestrictedUser<T extends Record<string, unknown>>(userData: T): T {
  const ud = userData as Record<string, unknown>;
  ud.role = 'user';
  ud.roles = [];
  ud.scopes = [];
  ud.permissions = [];
  ud.accountAccess = 'restricted';
  return userData;
}
