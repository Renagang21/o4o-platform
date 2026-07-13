/**
 * Supplier STORE Description Review API (operator 최소 검수 큐)
 *
 * WO-O4O-NETURE-SUPPLIER-STORE-DESCRIPTION-DRAFT-SAVE-AND-REVIEW-QUEUE-V1
 * backend: /api/v1/admin/o4o-product-db/supplier-store-descriptions
 *   - source_type='supplier' AND description_type='STORE' 전용.
 *   - list/detail read-only + approve(canonical 승격)/reject(hidden).
 */
import { authClient } from '@o4o/auth-client';

const BASE = '/admin/o4o-product-db/supplier-store-descriptions';

export interface SupplierStoreReviewRow {
  id: string;
  masterId: string;
  status: string;
  language: string | null;
  summary: string | null;
  contentPreview: string | null;
  submittedAt: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  supplierId: string | null;
  masterName: string | null;
  manufacturerName: string | null;
  barcode: string | null;
  supplierName: string | null;
  authorName: string | null;
  authorEmail: string | null;
}

export interface SupplierStoreReviewDetail extends SupplierStoreReviewRow {
  content: string;
  sourceRefId: string | null;
  curatedBy: string | null;
  curatedAt: string | null;
}

export interface SupplierStoreReviewListParams {
  status?: string; // needs_review(기본) | draft | canonical | all
  q?: string;
  page?: number;
  limit?: number;
}

export async function listSupplierStoreReview(
  params: SupplierStoreReviewListParams = {},
): Promise<{ items: SupplierStoreReviewRow[]; total: number }> {
  const query: Record<string, string> = {};
  if (params.status) query.status = params.status;
  if (params.q?.trim()) query.q = params.q.trim();
  query.page = String(params.page ?? 1);
  query.limit = String(params.limit ?? 20);
  const res = await authClient.api.get<{
    success: boolean;
    data: { items: SupplierStoreReviewRow[]; total: number };
  }>(`${BASE}?${new URLSearchParams(query).toString()}`);
  return {
    items: res.data?.data?.items ?? [],
    total: res.data?.data?.total ?? 0,
  };
}

export async function getSupplierStoreReviewDetail(id: string): Promise<SupplierStoreReviewDetail | null> {
  const res = await authClient.api.get<{ success: boolean; data: SupplierStoreReviewDetail }>(
    `${BASE}/${encodeURIComponent(id)}`,
  );
  return res.data?.data ?? null;
}

export async function approveSupplierStoreReview(id: string): Promise<void> {
  await authClient.api.post(`${BASE}/${encodeURIComponent(id)}/approve`);
}

export async function rejectSupplierStoreReview(id: string): Promise<void> {
  await authClient.api.post(`${BASE}/${encodeURIComponent(id)}/reject`);
}
