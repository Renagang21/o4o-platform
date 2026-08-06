/**
 * Pharmacy-Hub 매장 콘텐츠 API 클라이언트
 *
 * WO-PHARMACY-HUB-STORE-CONTENT-LIBRARY-V1
 *
 * 계약 (backend: controllers/pharmacy-hub/PharmacyHubStoreContentController.ts):
 *   GET    /pharmacy-hub/store-owner/content
 *   POST   /pharmacy-hub/store-owner/content
 *   GET    /pharmacy-hub/store-owner/content/:id
 *   PUT    /pharmacy-hub/store-owner/content/:id
 *   DELETE /pharmacy-hub/store-owner/content/:id
 *
 * ⚠️ organizationId 는 **보내지 않는다.** 대상 조직은 서버가 인증 사용자 +
 *   Pharmacy-Hub enrollment 로 결정한다 (미연결·다중이면 409). 본문에 넣으면 400.
 *
 * 원장은 공통 `kpa_store_contents` (= Store Production Material) 다 — 신규 테이블 0.
 * 본문 저장 키는 기존 공통 규약 그대로 `contentJson.html` 이다 (KPA 자료함 피드·PDF
 * 내보내기가 같은 키를 읽는다 — 새 키를 만들지 않는다).
 */
import { api } from '../apiClient';
import type { StoreConnectionState } from '../../components/store-owner/StoreConnectionNotice';

const BASE = '/pharmacy-hub/store-owner/content';

function unwrap<T>(body: any, fallbackMessage: string): T {
  if (!body?.success) {
    throw new Error(body?.error || fallbackMessage);
  }
  return body.data as T;
}

/** 목록 항목 — snapshot_edit(운영자 자료 사본)과 direct(매장 직접 작성)를 함께 담는다. */
export interface StoreContentListItem {
  id: string;
  sourceType: string;
  snapshotId: string | null;
  title: string;
  updatedAt: string;
}

export interface StoreContentsPage {
  storeConnection: StoreConnectionState;
  items: StoreContentListItem[];
  total: number;
}

/** direct 콘텐츠 단건 */
export interface StoreDirectContent {
  id: string;
  sourceType: string;
  organizationId?: string;
  title: string;
  contentJson: Record<string, unknown>;
  tags: string[];
  updatedAt: string;
  updatedBy: string | null;
}

export interface StoreDirectContentInput {
  title: string;
  contentJson: Record<string, unknown>;
  tags?: string[];
}

/** contentJson 에서 본문 HTML 추출 (키 규약: html). */
export function contentJsonToHtml(json: Record<string, unknown> | undefined | null): string {
  if (!json) return '';
  return typeof json.html === 'string' ? json.html : '';
}

export async function fetchStoreContents(): Promise<StoreContentsPage> {
  const res = await api.get(BASE);
  return unwrap<StoreContentsPage>(res.data, '매장 콘텐츠를 불러오지 못했습니다.');
}

export async function fetchStoreContent(id: string): Promise<StoreDirectContent> {
  const res = await api.get(`${BASE}/${id}`);
  return unwrap<StoreDirectContent>(res.data, '매장 콘텐츠를 불러오지 못했습니다.');
}

export async function createStoreContent(input: StoreDirectContentInput): Promise<StoreDirectContent> {
  const res = await api.post(BASE, input);
  return unwrap<StoreDirectContent>(res.data, '매장 콘텐츠를 저장하지 못했습니다.');
}

export async function updateStoreContent(
  id: string,
  input: Partial<StoreDirectContentInput>,
): Promise<StoreDirectContent> {
  const res = await api.put(`${BASE}/${id}`, input);
  return unwrap<StoreDirectContent>(res.data, '매장 콘텐츠를 수정하지 못했습니다.');
}

export async function deleteStoreContent(id: string): Promise<void> {
  const res = await api.delete(`${BASE}/${id}`);
  unwrap<unknown>(res.data, '매장 콘텐츠를 삭제하지 못했습니다.');
}
