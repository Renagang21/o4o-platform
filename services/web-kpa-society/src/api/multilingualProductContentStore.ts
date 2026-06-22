/**
 * Store Multilingual Product Content API Client — KPA store-owner
 *
 * WO-O4O-KPA-MULTILINGUAL-PRODUCT-CONTENT-HUB-FLOW-WEB-PILOT-V1
 *
 * 매장 경영자(store-owner)가 사용하는 다국어 상품 콘텐츠 API client.
 * - HUB 탐색: published 운영자 원본 목록
 * - 가져오기(=복사): 운영자 원본 → store-scoped copy (target 바인딩)
 * - 내 매장 콘텐츠 목록 / resolve(언어 fallback)
 *
 * Backend: WO-O4O-MULTILINGUAL-PRODUCT-CONTENT-API-V1 +
 *          WO-O4O-KPA-MULTILINGUAL-PRODUCT-CONTENT-HUB-FLOW-PILOT-V1 (Phase 1)
 *   /api/v1/kpa/pharmacy/multilingual-product-contents (+ /hub, /import, /:groupId/resolve)
 *
 * 권한 (backend 검증): kpa:store_owner
 */

import { getAccessToken } from '../contexts/AuthContext';

function getApiBase(): string {
  const base = import.meta.env.VITE_API_BASE_URL || '';
  return `${base}/api/v1/kpa/pharmacy/multilingual-product-contents`;
}

export type StoreMlcLocale = 'ko' | 'en' | 'zh' | 'ja' | 'vi' | 'th' | 'id';
export type StoreMlcTargetKind = 'local' | 'listing';
export type StoreMlcStatus = 'draft' | 'published' | 'archived';

export interface StoreMlcHubItem {
  id: string;
  serviceKey: string;
  contentKey: string;
  title: string;
  description?: string | null;
  defaultLocale: StoreMlcLocale;
  publishedAt?: string | null;
  updatedAt: string;
  locales: StoreMlcLocale[];
  localeCount: number;
}

export interface StoreMlcHubResponse {
  data: StoreMlcHubItem[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

export interface StoreMlcPage {
  id: string;
  groupId: string;
  locale: StoreMlcLocale;
  title: string;
  summary?: string | null;
  contentFormat: string;
  status: StoreMlcStatus;
  isDefault: boolean;
  sortOrder: number;
  updatedAt: string;
}

export interface StoreMlcGroup {
  id: string;
  organizationId: string;
  serviceKey?: string | null;
  targetKind: StoreMlcTargetKind;
  targetId: string;
  contentKey: string;
  title: string;
  defaultLocale: StoreMlcLocale;
  sourceType: string;
  sourceRefId?: string | null;
  status: StoreMlcStatus;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  pages: StoreMlcPage[];
}

export interface StoreMlcImportInput {
  sourceGroupId: string;
  targetKind: StoreMlcTargetKind;
  targetId: string;
  contentKey?: string;
}

async function authFetch(url: string, options: RequestInit = {}): Promise<any> {
  const token = getAccessToken();
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
  const json = await res.json();
  if (!json.success) {
    throw new Error(json.error?.message || json.error || `Request failed (${res.status})`);
  }
  return json;
}

/** HUB: published 운영자 원본 탐색 */
export async function listMlcHub(
  params?: { page?: number; limit?: number; search?: string },
): Promise<StoreMlcHubResponse> {
  const query = new URLSearchParams();
  if (params?.page) query.set('page', String(params.page));
  if (params?.limit) query.set('limit', String(params.limit));
  if (params?.search) query.set('search', params.search);
  const qs = query.toString();
  const json = await authFetch(`${getApiBase()}/hub${qs ? `?${qs}` : ''}`);
  return { data: json.data, meta: json.meta };
}

/** 가져오기 = 복사 (운영자 원본 → store-scoped copy, target 바인딩) */
export async function importMlcFromHub(input: StoreMlcImportInput): Promise<StoreMlcGroup> {
  const json = await authFetch(`${getApiBase()}/import`, { method: 'POST', body: JSON.stringify(input) });
  return json.data;
}

/** 내 매장 다국어 콘텐츠 목록 */
export async function listMyMlcGroups(
  params?: { targetKind?: StoreMlcTargetKind; targetId?: string; includeArchived?: boolean },
): Promise<StoreMlcGroup[]> {
  const query = new URLSearchParams();
  if (params?.targetKind) query.set('targetKind', params.targetKind);
  if (params?.targetId) query.set('targetId', params.targetId);
  if (params?.includeArchived) query.set('includeArchived', 'true');
  const qs = query.toString();
  const json = await authFetch(`${getApiBase()}${qs ? `?${qs}` : ''}`);
  return json.data;
}

/**
 * 상품별 다국어 콘텐츠 연결 상태 요약 (목록 배지용)
 * WO-O4O-KPA-STORE-PRODUCT-MULTILINGUAL-BADGES-PILOT-V1
 */
export interface StoreMlcSummaryItem {
  groupId: string;
  targetKind: StoreMlcTargetKind;
  targetId: string;
  title: string;
  status: StoreMlcStatus;
  sourceType: string;
  defaultLocale: StoreMlcLocale;
  updatedAt: string;
  locales: StoreMlcLocale[];
  localeCount: number;
  publishedLocaleCount: number;
}

/** targetId → 요약 매핑 (N+1 없이 목록 배지 렌더) */
export async function getMlcSummaryMap(
  targetKind: StoreMlcTargetKind,
): Promise<Map<string, StoreMlcSummaryItem>> {
  const json = await authFetch(`${getApiBase()}/summary?targetKind=${encodeURIComponent(targetKind)}`);
  const items: StoreMlcSummaryItem[] = json.data ?? [];
  const map = new Map<string, StoreMlcSummaryItem>();
  for (const item of items) {
    if (item?.targetId) map.set(item.targetId, item);
  }
  return map;
}

/** 언어 fallback resolve (검증용) */
export async function resolveMlc(
  groupId: string,
  locale: StoreMlcLocale,
): Promise<{ group: StoreMlcGroup; page: any; requestedLocale: StoreMlcLocale | null }> {
  const json = await authFetch(
    `${getApiBase()}/${encodeURIComponent(groupId)}/resolve?locale=${encodeURIComponent(locale)}`,
  );
  return json.data;
}
