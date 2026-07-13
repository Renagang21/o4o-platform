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
  reviewNote: string | null;
  revisionRequestedAt: string | null;
  revisionDueAt: string | null;
  masterName: string | null;
  manufacturerName: string | null;
  barcode: string | null;
  supplierName: string | null;
  authorName: string | null;
  authorEmail: string | null;
  /** 같은 (master, STORE, 언어) 에 이미 다른 canonical 이 있어 승인 불가 — WO-...-CANONICAL-CONFLICT-POLICY-V1 */
  hasCanonicalConflict: boolean;
  existingCanonicalId: string | null;
}

export interface SupplierStoreReviewDetail extends SupplierStoreReviewRow {
  content: string;
  sourceRefId: string | null;
  curatedBy: string | null;
  curatedAt: string | null;
  existingCanonicalUpdatedAt: string | null;
  existingCanonicalSourceType: string | null;
}

export interface RevisionExpiryResult {
  mode: 'dry-run' | 'apply';
  count: number;
  sampleIds: string[];
  deleted: number;
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

/** 수정 요청(사유 필수) — status=revision_requested, revision_due_at = now + 30일 */
export async function requestRevisionSupplierStoreReview(id: string, reason: string): Promise<void> {
  await authClient.api.post(`${BASE}/${encodeURIComponent(id)}/request-revision`, { reason });
}

/** 만료(수정 요청 후 기한 경과) 자동 삭제 — dry-run */
export async function expirySupplierStoreReviewDryRun(): Promise<RevisionExpiryResult> {
  const res = await authClient.api.get<{ success: boolean; data: RevisionExpiryResult }>(`${BASE}/expiry/dry-run`);
  return res.data.data;
}

/** 만료 자동 삭제 — apply(hard delete) */
export async function expirySupplierStoreReviewApply(): Promise<RevisionExpiryResult> {
  const res = await authClient.api.post<{ success: boolean; data: RevisionExpiryResult }>(`${BASE}/expiry/apply`);
  return res.data.data;
}
