/**
 * Pharmacy-Hub 태블릿 · Screen Set API 클라이언트
 *
 * WO-PHARMACY-HUB-STORE-TABLET-SERVICE-SCOPED-INTEGRATION-V1
 *
 * 백엔드는 **공통 태블릿 라우터**(`routes/platform/store-tablet.routes.ts`)를 그대로 쓴다.
 * Pharmacy-Hub 마운트는 조직 해석기만 PH enrollment 기준으로 갈아 끼운 것이라
 * 경로만 `/pharmacy-hub/store-owner/*` 로 다르고 계약은 KPA 와 동일하다.
 *
 *   GET/POST/PUT/DELETE /pharmacy-hub/store-owner/tablets[/:id]
 *   POST/DELETE         /pharmacy-hub/store-owner/tablets/:id/current-screen-set
 *   GET/POST/PATCH/DELETE /pharmacy-hub/store-owner/screen-sets[/:id]
 *   PUT                 /pharmacy-hub/store-owner/screen-sets/:id/blocks
 *   POST                /pharmacy-hub/store-owner/screen-sets/preview
 *   GET                 /pharmacy-hub/store-owner/tablet-content-sources/*
 *
 * ⚠️ organizationId 는 보내지 않는다 — 서버가 PH enrollment 로 결정한다.
 *    미연결·모호 매장은 409 `STORE_NOT_CONNECTED` / `AMBIGUOUS_STORE_CONNECTION` 이다.
 */
import { api } from '../apiClient';
import type {
  ScreenSet,
  ScreenSetDetail,
  ScreenSetBuilderApi,
  StoreContentSearchResult,
  O4oDescriptionSearchResult,
  ScreenSetProductPool,
} from '@o4o/tablet-screen-set-editor';
import type { ScreenBlock } from '@o4o/screen-content-core';

const BASE = '/pharmacy-hub/store-owner';

/** 공통 태블릿 라우터는 nested envelope(`{error:{code,message}}`)와 flat 을 섞어 쓴다 — 둘 다 받는다. */
function unwrap<T>(body: any, fallback: string): T {
  if (!body?.success) {
    throw new Error(body?.error?.message || body?.error || fallback);
  }
  return body.data as T;
}

// ─── 태블릿 ──────────────────────────────────────────────────────────────────

/**
 * 공통 `GET /tablets` 응답 형태 그대로다 —
 * `is_active`/`created_at` 은 snake_case 이고 `currentScreenSetId` 만 camel 로 alias 된다.
 * (실측으로 확인. 임의로 camel 로 가정하면 화면에서 undefined 가 된다.)
 */
export interface StoreTablet {
  id: string;
  name: string;
  location?: string | null;
  is_active?: boolean;
  created_at?: string;
  currentScreenSetId?: string | null;
}

/** 목록은 비활성(내린) 태블릿도 함께 반환한다 — 화면에서 걸러 쓴다. */
export function isTabletActive(t: StoreTablet): boolean {
  return t.is_active !== false;
}

export async function fetchTablets(): Promise<StoreTablet[]> {
  const res = await api.get(`${BASE}/tablets`);
  const data = unwrap<any>(res.data, '태블릿 목록을 불러오지 못했습니다.');
  return Array.isArray(data) ? data : (data.items ?? data.tablets ?? []);
}

export async function createTablet(input: { name: string; location?: string }): Promise<StoreTablet> {
  const res = await api.post(`${BASE}/tablets`, input);
  return unwrap<StoreTablet>(res.data, '태블릿을 등록하지 못했습니다.');
}

export async function updateTablet(
  id: string,
  input: { name?: string; location?: string; isActive?: boolean },
): Promise<StoreTablet> {
  const res = await api.put(`${BASE}/tablets/${id}`, input);
  return unwrap<StoreTablet>(res.data, '태블릿을 수정하지 못했습니다.');
}

/** 비활성화(soft delete) — 물리 삭제가 아니다. */
export async function deactivateTablet(id: string): Promise<void> {
  const res = await api.delete(`${BASE}/tablets/${id}`);
  unwrap<unknown>(res.data, '태블릿을 내리지 못했습니다.');
}

/** 이 태블릿에 지금 띄울 Screen Set 을 지정한다(전환). */
export async function applyCurrentScreenSet(tabletId: string, screenSetId: string): Promise<void> {
  const res = await api.post(`${BASE}/tablets/${tabletId}/current-screen-set`, { screenSetId });
  unwrap<unknown>(res.data, '화면을 적용하지 못했습니다.');
}

/** 적용 해제 — Screen Set 자체는 지워지지 않고 저장된 화면으로 남는다. */
export async function clearCurrentScreenSet(tabletId: string): Promise<void> {
  const res = await api.delete(`${BASE}/tablets/${tabletId}/current-screen-set`);
  unwrap<unknown>(res.data, '적용을 해제하지 못했습니다.');
}

// ─── Screen Set ──────────────────────────────────────────────────────────────

export async function fetchScreenSets(params?: {
  tabletId?: string;
  includeArchived?: boolean;
}): Promise<ScreenSet[]> {
  const res = await api.get(`${BASE}/screen-sets`, { params });
  const data = unwrap<any>(res.data, '화면 세트를 불러오지 못했습니다.');
  return Array.isArray(data) ? data : (data.items ?? []);
}

export async function fetchScreenSetDetail(id: string): Promise<ScreenSetDetail> {
  const res = await api.get(`${BASE}/screen-sets/${id}`);
  return unwrap<ScreenSetDetail>(res.data, '화면 세트를 불러오지 못했습니다.');
}

/** 보관(archive) — soft delete. 적용 중이면 서버가 409 로 막는다(먼저 해제해야 한다). */
export async function archiveScreenSet(id: string): Promise<void> {
  const res = await api.delete(`${BASE}/screen-sets/${id}`);
  unwrap<unknown>(res.data, '화면 세트를 보관하지 못했습니다.');
}

/**
 * 공유 편집기(`TabletContentStepBuilder`)에 주입하는 API 인스턴스.
 *
 * 편집기는 역할별 권한·경로를 알지 않는다 — 이 객체가 Pharmacy-Hub 경로를 담당한다.
 * (KPA·운영자·공급자 제작기도 같은 계약에 각자 인스턴스를 주입한다.)
 */
export const pharmacyHubScreenSetApi: ScreenSetBuilderApi = {
  async create(input) {
    const res = await api.post(`${BASE}/screen-sets`, input);
    return unwrap<ScreenSet>(res.data, '화면 세트를 만들지 못했습니다.');
  },
  async update(id, input) {
    const res = await api.patch(`${BASE}/screen-sets/${id}`, input);
    return unwrap<ScreenSet>(res.data, '화면 세트를 수정하지 못했습니다.');
  },
  async saveBlocks(id, blocks) {
    const res = await api.put(`${BASE}/screen-sets/${id}/blocks`, { blocks });
    const data = unwrap<any>(res.data, '화면 내용을 저장하지 못했습니다.');
    return (Array.isArray(data) ? data : (data.blocks ?? [])) as ScreenBlock[];
  },
  async preview(input) {
    const res = await api.post(`${BASE}/screen-sets/preview`, input);
    return unwrap<any>(res.data, '미리보기를 만들지 못했습니다.');
  },
  async searchO4oDescriptions(q) {
    const res = await api.get(`${BASE}/tablet-content-sources/o4o-descriptions`, { params: { q } });
    const data = unwrap<any>(res.data, '상품 설명을 찾지 못했습니다.');
    return (Array.isArray(data) ? data : (data.items ?? [])) as O4oDescriptionSearchResult[];
  },
  async searchStoreContents(q) {
    const res = await api.get(`${BASE}/tablet-content-sources/store-contents`, { params: { q } });
    const data = unwrap<any>(res.data, '매장 콘텐츠를 찾지 못했습니다.');
    return (Array.isArray(data) ? data : (data.items ?? [])) as StoreContentSearchResult[];
  },
};

/**
 * 편집기 상품 선택 목록 — 매장 경영활용 제품 + 매장 자체 상품.
 * 미주입이면 편집기가 상품 영역을 아예 노출하지 않으므로, PH 도 같은 원천을 연결한다.
 */
export async function fetchScreenSetProductPool(): Promise<ScreenSetProductPool> {
  const res = await api.get(`${BASE}/product-pool`);
  // 공통 라우터가 이미 편집기 계약과 같은 형태({supplierProducts, localProducts})로 돌려준다 — 재매핑하지 않는다.
  return unwrap<ScreenSetProductPool>(res.data, '상품 목록을 불러오지 못했습니다.');
}
