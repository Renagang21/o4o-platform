/**
 * createOperatorServicesApi — 운영 가능 서비스 목록 공통 클라이언트 팩토리
 *
 * WO-O4O-SERVICE-OPERATOR-WORKSPACE-REALIGNMENT-V1 (2026-09-16)
 *
 * canonical 출처는 서버 `GET /api/v1/work-scope/operator-services` 하나다
 * (WO-O4O-SERVICE-TENANT-FOUNDATION-V1 — role_assignments(`{prefix}:admin|operator`, active)
 *  + service_memberships(active) 결합, 새 membership 테이블 · role 시스템 없음).
 * 이 파일은 응답 계약 타입 + 표시용 순수 선별 + 전송 주입만 소유한다.
 *
 * 전송 계층은 `@o4o/store-ui-core` createStoreServicesApi 와 같은 주입 방식이다 — 이 경로는
 * 서비스 네임스페이스가 아니라 **`/api/v1` 루트** 아래에 있으므로 서비스는 루트 client 를 넘긴다.
 *
 * 다른 서비스 진입은 기존 `POST /auth/handoff` 계약을 그대로 재사용한다 (서버 계약 무변경).
 * handoff 는 대상 서비스의 membership 을 다시 검증하고, 운영 API 는 각 서비스 scope guard 가
 * 판정하므로 이 목록·이동은 권한을 넓히지 않는다 — 목록은 안내이고 접근 판정은 서버가 한다.
 * URL · serviceKey 를 임의로 바꿔도 목록 밖 서비스에는 들어갈 수 없다.
 */

export interface OperatorServicesHttp {
  /** url 은 `/work-scope/...` · `/auth/...` 형태의 `/api/v1` 기준 상대 경로. 응답 envelope 를 그대로 반환한다. */
  get<T>(url: string): Promise<T>;
  post<T>(url: string, body?: unknown): Promise<T>;
}

interface Envelope<T> {
  success: boolean;
  data: T;
}

// ─── 응답 계약 (apps/api-server/src/utils/service-tenant.resolver.ts 와 동일) ──

export type OperatorScopeLevel = 'admin' | 'operator';
export type OperatorServiceWorkspaceMode = 'standard' | 'special' | 'none' | 'undecided';

export interface OperatorServiceMembership {
  serviceKey: string;
  serviceName: string;
  /** 보유 최고 scope. admin 은 operator 를 포함한다 */
  scope: OperatorScopeLevel;
  workspaceMode: OperatorServiceWorkspaceMode;
  /** = catalog operatorWorkspaceEnabled. 권한 SSOT 가 아니다 */
  workspaceAvailable: boolean;
}

// ─── 표시용 순수 선별 ────────────────────────────────────────────────────────

/**
 * 표준 운영자 화면 진입 경로. standard · special 서비스는 `/operator` (Neture 포함).
 * `none`(kpa-branch — 분회 slug 아래 화면) · `undecided` 는 이 컴포넌트가 경로를 알 수 없으므로 null —
 * 목록에는 남기되 링크를 만들지 않는다 (임의 경로 추측 금지 · dead link 0).
 */
export function defaultOperatorEntryPath(s: OperatorServiceMembership): string | null {
  if (!s.workspaceAvailable) return null;
  if (s.workspaceMode === 'standard' || s.workspaceMode === 'special') return '/operator';
  return null;
}

export interface OperatorServicesSelection {
  /** workspaceAvailable=true — 운영 화면이 있는 서비스 */
  available: OperatorServiceMembership[];
  /** 목록에는 남지만 운영 화면이 없는 서비스 */
  unavailable: OperatorServiceMembership[];
}

export function selectOperatorServices(
  list: OperatorServiceMembership[] | null | undefined,
): OperatorServicesSelection {
  const rows = Array.isArray(list) ? list : [];
  return {
    available: rows.filter((s) => s.workspaceAvailable),
    unavailable: rows.filter((s) => !s.workspaceAvailable),
  };
}

// ─── 팩토리 ──────────────────────────────────────────────────────────────────

export interface OperatorServicesApi {
  fetchOperatorServices(): Promise<OperatorServiceMembership[]>;
  /** 다른 서비스 진입 URL (https) — 이동은 호출부가 한다 */
  resolveServiceEntryUrl(serviceKey: string, returnPath: string): Promise<string>;
}

export function createOperatorServicesApi(http: OperatorServicesHttp): OperatorServicesApi {
  return {
    async fetchOperatorServices() {
      const res = await http.get<Envelope<{ services: OperatorServiceMembership[] }>>(
        '/work-scope/operator-services',
      );
      const services = res.data?.services;
      return Array.isArray(services) ? services : [];
    },
    async resolveServiceEntryUrl(serviceKey, returnPath) {
      const res = await http.post<Envelope<{ targetUrl?: string }>>('/auth/handoff', {
        targetServiceKey: serviceKey,
        returnPath,
      });
      const url = res.data?.targetUrl;
      if (!url || !/^https:\/\//.test(url)) {
        throw new Error('서비스 이동 주소를 확인하지 못했습니다.');
      }
      return url;
    },
  };
}
