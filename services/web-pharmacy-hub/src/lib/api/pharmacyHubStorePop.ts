/**
 * Pharmacy-Hub 매장 POP API 클라이언트
 *
 * WO-PHARMACY-HUB-STORE-EXECUTION-ASSETS-V1 (범위 B)
 *
 * 계약 (backend: controllers/pharmacy-hub/PharmacyHubStorePopController.ts):
 *   GET    /pharmacy-hub/store-owner/pop
 *   GET    /pharmacy-hub/store-owner/pop/hub
 *   POST   /pharmacy-hub/store-owner/pop
 *   POST   /pharmacy-hub/store-owner/pop/import
 *   GET    /pharmacy-hub/store-owner/pop/:id
 *   PUT    /pharmacy-hub/store-owner/pop/:id
 *   PATCH  /pharmacy-hub/store-owner/pop/:id/publish
 *   PATCH  /pharmacy-hub/store-owner/pop/:id/archive
 *   DELETE /pharmacy-hub/store-owner/pop/:id
 *
 * ⚠️ organizationId / storeId / serviceKey / authorRole 는 **보내지 않는다.**
 *    서버가 결정하며, 보내면 400 FIELD_NOT_ACCEPTED 로 거부된다.
 *
 * 원장은 공통 `store_pops` 다 — 신규 테이블 0.
 */
import { api } from '../apiClient';
import type { StoreConnectionState } from '../../components/store-owner/StoreConnectionNotice';

const BASE = '/pharmacy-hub/store-owner/pop';

function unwrap<T>(body: any, fallbackMessage: string): T {
  if (!body?.success) {
    throw new Error(body?.error || fallbackMessage);
  }
  return body.data as T;
}

export type PopStatus = 'draft' | 'published' | 'archived';

export interface StorePop {
  id: string;
  storeId: string;
  serviceKey: string;
  authorRole: string;
  title: string;
  slug: string;
  excerpt?: string | null;
  content: string;
  status: PopStatus;
  publishedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface StorePopPage {
  storeConnection: StoreConnectionState;
  items: StorePop[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/** 운영자 HUB 원본 (가져오기 대상). Pharmacy-Hub 에 원본이 없으면 빈 배열이 정상이다. */
export interface PopHubSource {
  id: string;
  title: string;
  excerpt: string | null;
  publishedAt: string | null;
}

export interface PopInput {
  title: string;
  content?: string;
  excerpt?: string;
}

export async function fetchStorePops(params?: {
  page?: number;
  limit?: number;
  status?: PopStatus;
}): Promise<StorePopPage> {
  const res = await api.get(BASE, { params });
  return unwrap<StorePopPage>(res.data, 'POP 목록을 불러오지 못했습니다.');
}

export async function fetchPopHubSources(): Promise<{
  storeConnection: StoreConnectionState;
  items: PopHubSource[];
}> {
  const res = await api.get(`${BASE}/hub`);
  return unwrap(res.data, '운영자 자료를 불러오지 못했습니다.');
}

export async function fetchStorePop(id: string): Promise<{
  storeConnection: StoreConnectionState;
  pop: StorePop | null;
}> {
  const res = await api.get(`${BASE}/${id}`);
  return unwrap(res.data, 'POP 을 불러오지 못했습니다.');
}

export async function createStorePop(input: PopInput): Promise<StorePop> {
  const res = await api.post(BASE, input);
  return unwrap<StorePop>(res.data, 'POP 을 만들지 못했습니다.');
}

/** 운영자 HUB 원본을 매장 독립 사본으로 가져온다 (새 id · status='draft'). */
export async function importStorePop(sourceId: string): Promise<StorePop> {
  const res = await api.post(`${BASE}/import`, { sourceId });
  return unwrap<StorePop>(res.data, '운영자 자료를 가져오지 못했습니다.');
}

export async function updateStorePop(id: string, input: Partial<PopInput>): Promise<StorePop> {
  const res = await api.put(`${BASE}/${id}`, input);
  return unwrap<StorePop>(res.data, 'POP 을 수정하지 못했습니다.');
}

export async function publishStorePop(id: string): Promise<StorePop> {
  const res = await api.patch(`${BASE}/${id}/publish`, {});
  return unwrap<StorePop>(res.data, 'POP 을 발행하지 못했습니다.');
}

/** 보관 — 매장 목록에서 내린다. 삭제가 아니라 되돌릴 수 있다. */
export async function archiveStorePop(id: string): Promise<StorePop> {
  const res = await api.patch(`${BASE}/${id}/archive`, {});
  return unwrap<StorePop>(res.data, 'POP 을 보관하지 못했습니다.');
}

export async function deleteStorePop(id: string): Promise<void> {
  const res = await api.delete(`${BASE}/${id}`);
  unwrap<unknown>(res.data, 'POP 을 삭제하지 못했습니다.');
}
