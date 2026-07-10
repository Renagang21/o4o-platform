/**
 * Store Product Requests ADMIN API (P2)
 *
 * WO-O4O-KPA-STORE-NEW-PRODUCT-REQUEST-AND-ADMIN-APPROVAL-V1 (Phase 2)
 *
 * store_web 신규 상품 등록 요청의 관리자 검토·승인 client.
 * 기존 candidate 콘솔 코어(o4o-product-db.api listProductCandidates)와 별개.
 * 백엔드: /operator/store-product-requests (operator/admin guard + service scope)
 */

import { authClient } from '@o4o/auth-client';

export type StoreRequestDisplayStatus = 'reviewing' | 'revision_requested' | 'registered' | 'rejected';

export interface StoreRequestAdminRow {
  id: string;
  productName: string | null;
  classification: { code: string; label: string };
  manufacturer: string | null;
  spec: string | null;
  unit: string | null;
  imageUrl: string | null;
  barcode: string | null;
  noBarcode: boolean;
  candidateStatus: string;
  displayStatus: StoreRequestDisplayStatus;
  displayStatusLabel: string;
  reviewNote: string | null;
  matchedProductMasterId: string | null;
  organizationId: string | null;
  organizationName: string | null;
  serviceKey: string | null;
  submittedBy: string | null;
  createdAt: string;
  updatedAt: string;
  reviewable: boolean;
}

export interface StoreRequestDuplicate {
  id: string;
  name: string | null;
  barcode: string | null;
  manufacturerName: string | null;
  matchType: 'barcode' | 'name_manufacturer';
}

export interface StoreRequestListResult {
  items: StoreRequestAdminRow[];
  total: number;
  page: number;
  totalPages: number;
}

export async function listStoreProductRequests(params: {
  displayStatus?: StoreRequestDisplayStatus | '';
  search?: string;
  serviceKey?: string;
  page?: number;
  limit?: number;
} = {}): Promise<StoreRequestListResult> {
  const query: Record<string, string> = {};
  if (params.serviceKey) query.serviceKey = params.serviceKey;
  else query.all = 'true'; // platform cross-service opt-in
  if (params.displayStatus) query.displayStatus = params.displayStatus;
  if (params.search?.trim()) query.search = params.search.trim();
  query.page = String(params.page ?? 1);
  query.limit = String(params.limit ?? 20);

  const res = await authClient.api.get<{
    success: boolean;
    data: StoreRequestAdminRow[];
    meta: { page: number; limit: number; total: number; totalPages: number };
  }>(`/operator/store-product-requests?${new URLSearchParams(query).toString()}`);

  return {
    items: res.data?.data ?? [],
    total: res.data?.meta?.total ?? 0,
    page: res.data?.meta?.page ?? 1,
    totalPages: res.data?.meta?.totalPages ?? 1,
  };
}

export async function getStoreRequestDuplicates(id: string): Promise<StoreRequestDuplicate[]> {
  const res = await authClient.api.get<{ success: boolean; data: StoreRequestDuplicate[] }>(
    `/operator/store-product-requests/${encodeURIComponent(id)}/duplicates`,
  );
  return res.data?.data ?? [];
}

export async function linkStoreRequestToMaster(id: string, masterId: string, note?: string): Promise<void> {
  await authClient.api.post(`/operator/store-product-requests/${encodeURIComponent(id)}/link`, { masterId, note });
}

export async function approveStoreRequestAsNewMaster(id: string, note?: string): Promise<{ masterId: string }> {
  const res = await authClient.api.post<{ success: boolean; data: { masterId: string } }>(
    `/operator/store-product-requests/${encodeURIComponent(id)}/approve-new`, { note },
  );
  return res.data?.data;
}

export async function requestStoreRequestRevision(id: string, note: string): Promise<void> {
  await authClient.api.post(`/operator/store-product-requests/${encodeURIComponent(id)}/request-revision`, { note });
}

export async function rejectStoreRequest(id: string, reason?: string): Promise<void> {
  await authClient.api.post(`/operator/store-product-requests/${encodeURIComponent(id)}/reject`, { reason });
}
