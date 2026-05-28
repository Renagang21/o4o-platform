/**
 * Operator QR Template API Client — K-Cosmetics Operator HUB QR Write
 *
 * WO-O4O-KCOSMETICS-OPERATOR-BLOG-POP-QR-BOOTSTRAP-V1
 *
 * 운영자가 K-Cosmetics 매장 HUB 에 게시할 QR 템플릿을 작성/수정/게시하는 API client.
 * Backend: /api/v1/cosmetics/operator/qr/templates (CRUD + publish + archive)
 * 권한 (backend 검증): cosmetics:operator / cosmetics:admin / platform:admin / platform:super_admin
 */

import { authClient } from '../lib/apiClient';

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

const BASE = '/cosmetics/operator/qr';

export async function listOperatorQrTemplates(
  params?: { page?: number; limit?: number; status?: OperatorQrTemplateStatus },
): Promise<OperatorQrListResponse> {
  const res = await authClient.api.get<{ success: boolean; data: OperatorQrTemplate[]; meta: OperatorQrListResponse['meta'] }>(
    `${BASE}/templates`,
    { params },
  );
  return { data: res.data.data, meta: res.data.meta };
}

export async function getOperatorQrTemplate(id: string): Promise<OperatorQrTemplate> {
  const res = await authClient.api.get<{ success: boolean; data: OperatorQrTemplate }>(`${BASE}/templates/${id}`);
  return res.data.data;
}

export async function createOperatorQrTemplate(input: OperatorQrCreateInput): Promise<OperatorQrTemplate> {
  const res = await authClient.api.post<{ success: boolean; data: OperatorQrTemplate }>(`${BASE}/templates`, input);
  return res.data.data;
}

export async function updateOperatorQrTemplate(id: string, input: OperatorQrUpdateInput): Promise<OperatorQrTemplate> {
  const res = await authClient.api.put<{ success: boolean; data: OperatorQrTemplate }>(`${BASE}/templates/${id}`, input);
  return res.data.data;
}

export async function publishOperatorQrTemplate(id: string): Promise<OperatorQrTemplate> {
  const res = await authClient.api.patch<{ success: boolean; data: OperatorQrTemplate }>(`${BASE}/templates/${id}/publish`);
  return res.data.data;
}

export async function archiveOperatorQrTemplate(id: string): Promise<OperatorQrTemplate> {
  const res = await authClient.api.patch<{ success: boolean; data: OperatorQrTemplate }>(`${BASE}/templates/${id}/archive`);
  return res.data.data;
}

export async function deleteOperatorQrTemplate(id: string): Promise<void> {
  await authClient.api.delete(`${BASE}/templates/${id}`);
}
