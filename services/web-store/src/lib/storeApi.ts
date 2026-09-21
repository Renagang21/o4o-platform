/**
 * Unified Store Context 조회 — 서버 정본은 두 경로뿐이다.
 *   GET /api/v1/work-scope/accessible-stores            → 접근 가능한 매장 조직 목록(Selector 입력 · additive 신규)
 *   GET /api/v1/work-scope/store-services?organizationId → 그 매장의 enrollment(1 Store : N Services · 기존 계약 무변경)
 * 응답 타입은 apps/api-server/src/utils/service-tenant.resolver.ts 와 동일하다.
 */
import { api } from './apiClient';

export interface AccessibleStore {
  organizationId: string;
  organizationName: string;
  memberRole: string;
}

export type StoreServiceEnrollmentStatus = 'active' | 'inactive';
export type StoreServiceWorkspaceMode = 'standard' | 'special' | 'none' | 'undecided';
export interface StoreServiceMembership {
  organizationId: string;
  serviceKey: string;
  serviceName: string;
  enrollmentStatus: StoreServiceEnrollmentStatus;
  workspaceMode: StoreServiceWorkspaceMode;
  workspaceAvailable: boolean;
}
export type StoreServiceResolutionStatus = 'resolved' | 'none' | 'ambiguous';
export type StoreServiceResolutionReason = 'NO_ACCESSIBLE_STORE' | 'MULTIPLE_ACCESSIBLE_STORES' | 'NOT_STORE_MEMBER';
export interface StoreServiceResolution {
  status: StoreServiceResolutionStatus;
  organizationId: string | null;
  services: StoreServiceMembership[];
  reason: StoreServiceResolutionReason | null;
}

interface Envelope<T> { success: boolean; data: T }

export async function fetchAccessibleStores(): Promise<AccessibleStore[]> {
  const res = await api.get('/work-scope/accessible-stores');
  const body = res.data as Envelope<{ stores?: AccessibleStore[] }>;
  return Array.isArray(body?.data?.stores) ? body.data.stores : [];
}

/** organizationId 는 항상 명시한다 — Unified 경로에서 서버 자동 선택(1개일 때만)에 기대지 않는다. */
export async function fetchStoreServices(organizationId: string): Promise<StoreServiceResolution> {
  const res = await api.get(`/work-scope/store-services?organizationId=${encodeURIComponent(organizationId)}`);
  return (res.data as Envelope<StoreServiceResolution>).data;
}
