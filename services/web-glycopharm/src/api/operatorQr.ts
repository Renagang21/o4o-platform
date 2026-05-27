/**
 * Operator QR Template API Client — GlycoPharm Operator HUB QR Write
 *
 * WO-O4O-GLYCOPHARM-OPERATOR-QR-WRITE-FRONTEND-V1 (2026-05-27)
 *
 * 운영자가 GlycoPharm 약국 HUB 에 게시할 QR "템플릿" 을 작성/수정/게시하는 API client.
 * Backend 는 server-side 에서 authorRole='operator', serviceKey='glycopharm' 강제.
 * → 프론트는 title / description / targetType / target_* 만 전송한다.
 *
 * Backend: WO-O4O-GLYCOPHARM-STORE-HUB-QR-BACKEND-FOUNDATION-V1
 *   /api/v1/glycopharm/operator/qr/templates (CRUD + publish + archive)
 *
 * 권한 (backend 검증):
 *   glycopharm:operator / glycopharm:admin / platform:admin / platform:super_admin
 *
 * 주의:
 *   - 운영자 단계에서는 slug / organizationId 없음 (entity 자체 부재)
 *   - 매장 가져가기 시 기존 store_qr_codes 에 매장 사본 INSERT (Phase 3-B 후속)
 */

import { getAccessToken } from '../contexts/AuthContext';

function getApiBase(): string {
  const base = import.meta.env.VITE_API_BASE_URL || '';
  return `${base}/api/v1/glycopharm/operator/qr`;
}

export type OperatorQrTemplateStatus = 'draft' | 'published' | 'archived';
export type OperatorQrTemplateTargetType = 'url' | 'content';
export type OperatorQrTemplateContentKind = 'blog' | 'cms' | 'pop';

export interface OperatorQrTemplate {
  id: string;
  serviceKey: string;
  authorRole: 'operator';
  title: string;
  description?: string;
  status: OperatorQrTemplateStatus;
  targetType: OperatorQrTemplateTargetType;
  targetUrl?: string;
  targetContentKind?: OperatorQrTemplateContentKind;
  targetContentRef?: string;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OperatorQrListResponse {
  data: OperatorQrTemplate[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

export type OperatorQrCreateInput =
  | {
      title: string;
      description?: string;
      targetType: 'url';
      targetUrl: string;
    }
  | {
      title: string;
      description?: string;
      targetType: 'content';
      targetContentKind: OperatorQrTemplateContentKind;
      targetContentRef: string;
    };

export type OperatorQrUpdateInput = Partial<{
  title: string;
  description: string;
  targetType: OperatorQrTemplateTargetType;
  targetUrl: string;
  targetContentKind: OperatorQrTemplateContentKind;
  targetContentRef: string;
}>;

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
    throw new Error(json.error?.message || `Request failed (${res.status})`);
  }
  return json;
}

export async function listOperatorQrTemplates(
  params?: { page?: number; limit?: number; status?: OperatorQrTemplateStatus },
): Promise<OperatorQrListResponse> {
  const query = new URLSearchParams();
  if (params?.page) query.set('page', String(params.page));
  if (params?.limit) query.set('limit', String(params.limit));
  if (params?.status) query.set('status', params.status);
  const qs = query.toString();
  const url = `${getApiBase()}/templates${qs ? `?${qs}` : ''}`;
  const json = await authFetch(url);
  return { data: json.data, meta: json.meta };
}

export async function getOperatorQrTemplate(id: string): Promise<OperatorQrTemplate> {
  const url = `${getApiBase()}/templates/${encodeURIComponent(id)}`;
  const json = await authFetch(url);
  return json.data;
}

export async function createOperatorQrTemplate(
  input: OperatorQrCreateInput,
): Promise<OperatorQrTemplate> {
  const url = `${getApiBase()}/templates`;
  const json = await authFetch(url, { method: 'POST', body: JSON.stringify(input) });
  return json.data;
}

export async function updateOperatorQrTemplate(
  id: string,
  input: OperatorQrUpdateInput,
): Promise<OperatorQrTemplate> {
  const url = `${getApiBase()}/templates/${encodeURIComponent(id)}`;
  const json = await authFetch(url, { method: 'PUT', body: JSON.stringify(input) });
  return json.data;
}

export async function publishOperatorQrTemplate(id: string): Promise<OperatorQrTemplate> {
  const url = `${getApiBase()}/templates/${encodeURIComponent(id)}/publish`;
  const json = await authFetch(url, { method: 'PATCH' });
  return json.data;
}

export async function archiveOperatorQrTemplate(id: string): Promise<OperatorQrTemplate> {
  const url = `${getApiBase()}/templates/${encodeURIComponent(id)}/archive`;
  const json = await authFetch(url, { method: 'PATCH' });
  return json.data;
}

export async function deleteOperatorQrTemplate(id: string): Promise<void> {
  const url = `${getApiBase()}/templates/${encodeURIComponent(id)}`;
  await authFetch(url, { method: 'DELETE' });
}
