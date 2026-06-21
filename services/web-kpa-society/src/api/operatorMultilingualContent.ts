/**
 * Operator Multilingual Product Content API Client — KPA Operator HUB
 *
 * WO-O4O-KPA-MULTILINGUAL-PRODUCT-CONTENT-HUB-FLOW-WEB-PILOT-V1
 *
 * 운영자가 KPA 매장 HUB 에 게시할 다국어 상품 콘텐츠 ORIGINAL 을 작성/수정/게시하는 API client.
 * Backend 는 server-side 에서 author_role='operator', service_key='kpa' 강제.
 *
 * Backend: WO-O4O-KPA-MULTILINGUAL-PRODUCT-CONTENT-HUB-FLOW-PILOT-V1 (Phase 1)
 *   /api/v1/kpa/operator/multilingual-product-contents/groups (CRUD + publish + archive + pages)
 *
 * 권한 (backend 검증): kpa:operator / kpa:admin / platform:admin / platform:super_admin
 */

import { getAccessToken } from '../contexts/AuthContext';

function getApiBase(): string {
  const base = import.meta.env.VITE_API_BASE_URL || '';
  return `${base}/api/v1/kpa/operator/multilingual-product-contents`;
}

export type OperatorMlcLocale = 'ko' | 'en' | 'zh' | 'ja' | 'vi' | 'th' | 'id';
export type OperatorMlcStatus = 'draft' | 'published' | 'archived';
export type OperatorMlcContentFormat = 'blocks' | 'html' | 'image_sequence' | 'json';

export const OPERATOR_MLC_LOCALES: OperatorMlcLocale[] = ['ko', 'en', 'zh', 'ja', 'vi', 'th', 'id'];
export const OPERATOR_MLC_LOCALE_LABELS: Record<OperatorMlcLocale, string> = {
  ko: '한국어',
  en: 'English',
  zh: '中文',
  ja: '日本語',
  vi: 'Tiếng Việt',
  th: 'ภาษาไทย',
  id: 'Bahasa',
};

export interface OperatorMlcPage {
  id: string;
  groupId: string;
  locale: OperatorMlcLocale;
  title: string;
  summary?: string | null;
  contentFormat: OperatorMlcContentFormat;
  content: Record<string, unknown>;
  assets: Array<Record<string, unknown>>;
  buttons: Array<Record<string, unknown>>;
  status: OperatorMlcStatus;
  isDefault: boolean;
  sortOrder: number;
  updatedAt: string;
}

export interface OperatorMlcGroup {
  id: string;
  serviceKey: string;
  authorRole: 'operator';
  contentKey: string;
  title: string;
  description?: string | null;
  defaultLocale: OperatorMlcLocale;
  status: OperatorMlcStatus;
  publishedAt?: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  pages: OperatorMlcPage[];
}

export interface OperatorMlcListResponse {
  data: OperatorMlcGroup[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

export interface OperatorMlcCreateInput {
  title: string;
  description?: string;
  contentKey?: string;
  defaultLocale?: OperatorMlcLocale;
}

export interface OperatorMlcUpdateInput {
  title?: string;
  description?: string | null;
  contentKey?: string;
  defaultLocale?: OperatorMlcLocale;
  metadata?: Record<string, unknown>;
}

export interface OperatorMlcPageInput {
  title: string;
  summary?: string;
  contentFormat?: OperatorMlcContentFormat;
  content?: Record<string, unknown>;
  assets?: Array<Record<string, unknown>>;
  buttons?: Array<Record<string, unknown>>;
  status?: OperatorMlcStatus;
  isDefault?: boolean;
  sortOrder?: number;
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

export async function listOperatorMlcGroups(
  params?: { page?: number; limit?: number; status?: OperatorMlcStatus },
): Promise<OperatorMlcListResponse> {
  const query = new URLSearchParams();
  if (params?.page) query.set('page', String(params.page));
  if (params?.limit) query.set('limit', String(params.limit));
  if (params?.status) query.set('status', params.status);
  const qs = query.toString();
  const json = await authFetch(`${getApiBase()}/groups${qs ? `?${qs}` : ''}`);
  return { data: json.data, meta: json.meta };
}

export async function getOperatorMlcGroup(id: string): Promise<OperatorMlcGroup> {
  const json = await authFetch(`${getApiBase()}/groups/${encodeURIComponent(id)}`);
  return json.data;
}

export async function createOperatorMlcGroup(input: OperatorMlcCreateInput): Promise<OperatorMlcGroup> {
  const json = await authFetch(`${getApiBase()}/groups`, { method: 'POST', body: JSON.stringify(input) });
  return json.data;
}

export async function updateOperatorMlcGroup(id: string, input: OperatorMlcUpdateInput): Promise<OperatorMlcGroup> {
  const json = await authFetch(`${getApiBase()}/groups/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(input) });
  return json.data;
}

export async function publishOperatorMlcGroup(id: string): Promise<OperatorMlcGroup> {
  const json = await authFetch(`${getApiBase()}/groups/${encodeURIComponent(id)}/publish`, { method: 'PATCH' });
  return json.data;
}

export async function archiveOperatorMlcGroup(id: string): Promise<OperatorMlcGroup> {
  const json = await authFetch(`${getApiBase()}/groups/${encodeURIComponent(id)}/archive`, { method: 'PATCH' });
  return json.data;
}

export async function deleteOperatorMlcGroup(id: string): Promise<void> {
  await authFetch(`${getApiBase()}/groups/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export async function upsertOperatorMlcPage(
  groupId: string,
  locale: OperatorMlcLocale,
  input: OperatorMlcPageInput,
): Promise<OperatorMlcGroup> {
  const json = await authFetch(
    `${getApiBase()}/groups/${encodeURIComponent(groupId)}/pages/${encodeURIComponent(locale)}`,
    { method: 'PUT', body: JSON.stringify(input) },
  );
  return json.data;
}

export async function setOperatorMlcPageStatus(
  groupId: string,
  locale: OperatorMlcLocale,
  status: OperatorMlcStatus,
): Promise<OperatorMlcGroup> {
  const json = await authFetch(
    `${getApiBase()}/groups/${encodeURIComponent(groupId)}/pages/${encodeURIComponent(locale)}/status`,
    { method: 'PATCH', body: JSON.stringify({ status }) },
  );
  return json.data;
}
