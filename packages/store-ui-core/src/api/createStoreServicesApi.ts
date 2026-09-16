/**
 * createStoreServicesApi — My Services 공통 클라이언트 팩토리
 *
 * WO-O4O-STORE-WORKSPACE-INTEGRATION-AND-MY-SERVICES-V1 (§7)
 *
 * canonical 출처는 서버 `GET /api/v1/work-scope/store-services` 하나다
 * (WO-O4O-SERVICE-TENANT-FOUNDATION-V1 — junction 은 organization_service_enrollments 뿐,
 * 새 membership 테이블 없음). 이 파일은 응답 계약 타입 + 표시용 순수 선별 + 전송 주입만 소유한다.
 *
 * 전송 계층은 `createStoreHubApi` 와 같은 주입 방식이다. 다만 이 경로는 서비스 네임스페이스
 * (`/kpa`, `/cosmetics`)가 아니라 **`/api/v1` 루트** 아래에 있으므로 서비스는 루트 client
 * (KPA `coreApiClient`, KCos/PH `authClient.api`)를 넘겨야 한다.
 *
 * 다른 서비스 진입은 기존 `POST /auth/handoff` 계약을 그대로 재사용한다 (서버 계약 무변경).
 * handoff 는 대상 서비스의 service_memberships active 를 다시 검증하므로 이 화면이 권한을
 * 넓히지 않는다 — 목록은 안내이고 접근 판정은 서버 guard 가 한다.
 */

export interface StoreServicesHttp {
  /** url 은 `/work-scope/...` · `/auth/...` 형태의 `/api/v1` 기준 상대 경로. 응답 envelope 를 그대로 반환한다. */
  get<T>(url: string): Promise<T>;
  post<T>(url: string, body?: unknown): Promise<T>;
}

interface Envelope<T> {
  success: boolean;
  data: T;
}

// ─── 응답 계약 (apps/api-server/src/utils/service-tenant.resolver.ts 와 동일) ──

export type StoreServiceEnrollmentStatus = 'active' | 'inactive';
export type StoreServiceWorkspaceMode = 'standard' | 'special' | 'none' | 'undecided';

export interface StoreServiceMembership {
  organizationId: string;
  serviceKey: string;
  serviceName: string;
  enrollmentStatus: StoreServiceEnrollmentStatus;
  workspaceMode: StoreServiceWorkspaceMode;
  /** enrollment active AND catalog storeWorkspaceEnabled — 노출 자격이지 권한 SSOT 가 아니다 */
  workspaceAvailable: boolean;
}

export type StoreServiceResolutionStatus = 'resolved' | 'none' | 'ambiguous';
export type StoreServiceResolutionReason =
  | 'NO_ACCESSIBLE_STORE'
  | 'MULTIPLE_ACCESSIBLE_STORES'
  | 'NOT_STORE_MEMBER';

export interface StoreServiceResolution {
  status: StoreServiceResolutionStatus;
  organizationId: string | null;
  services: StoreServiceMembership[];
  reason: StoreServiceResolutionReason | null;
}

// ─── 표시용 순수 선별 (WO §7 · §21 시나리오) ────────────────────────────────

export interface MyServicesSelection {
  /** enrollmentStatus=active AND workspaceAvailable=true — 진입 가능 */
  available: StoreServiceMembership[];
  /** 목록에는 남지만 진입 불가 (inactive 또는 workspace 미제공) — 상태를 분명히 표시한다 */
  unavailable: StoreServiceMembership[];
}

/**
 * 한 매장(resolution.organizationId)의 서비스만 남긴다. 서버가 이미 한 조직으로 스코프하지만
 * 다른 조직의 행이 섞여 오면 표시하지 않는다(WO §21 "다른 조직 혼입 = FAIL" 의 클라이언트 방어선).
 */
export function selectMyServices(resolution: StoreServiceResolution | null | undefined): MyServicesSelection {
  if (!resolution || resolution.status !== 'resolved' || !resolution.organizationId) {
    return { available: [], unavailable: [] };
  }
  const own = resolution.services.filter((s) => s.organizationId === resolution.organizationId);
  return {
    available: own.filter((s) => s.enrollmentStatus === 'active' && s.workspaceAvailable),
    unavailable: own.filter((s) => !(s.enrollmentStatus === 'active' && s.workspaceAvailable)),
  };
}

// ─── 팩토리 ──────────────────────────────────────────────────────────────────

export interface StoreServicesApi {
  /** organizationId 미지정 시 접근 가능한 매장이 정확히 1개일 때만 resolved (서버 규칙) */
  fetchStoreServices(organizationId?: string | null): Promise<StoreServiceResolution>;
  /** 다른 서비스 진입 URL (https) — 이동은 호출부가 한다 */
  resolveServiceEntryUrl(serviceKey: string, returnPath: string): Promise<string>;
}

export function createStoreServicesApi(http: StoreServicesHttp): StoreServicesApi {
  return {
    async fetchStoreServices(organizationId) {
      const qs = organizationId ? `?organizationId=${encodeURIComponent(organizationId)}` : '';
      const res = await http.get<Envelope<StoreServiceResolution>>(`/work-scope/store-services${qs}`);
      return res.data;
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
