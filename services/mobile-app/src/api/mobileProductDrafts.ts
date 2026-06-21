/**
 * Mobile Product Drafts API client
 *
 * WO-O4O-MOBILE-PRODUCT-COLLECTION-APP-SHELL-V1
 * Baseline: docs/baseline/O4O-PRODUCT-CORE-BASELINE-V1.md §8 (모바일 = 수집)
 *
 * 기존 backend foundation(`/api/v1/mobile/product-drafts`, requireAuth, 본인 소유 경계)을
 * 그대로 소비한다. 모바일은 draft 생성/목록/상세/제출까지만 — convert-to-candidate 미호출.
 * controller 는 camelCase body 를 받는다.
 */
import { apiClient } from './client';

export type MobileDraftStatus =
  | 'draft'
  | 'submitted'
  | 'candidate_created'
  | 'reviewed'
  | 'rejected'
  | 'archived';

export interface MobileProductDraft {
  id: string;
  draftStatus: MobileDraftStatus;
  sourceApp?: string | null;
  identifierType?: string | null;
  identifierValue?: string | null;
  capturedName?: string | null;
  capturedBrand?: string | null;
  capturedManufacturer?: string | null;
  capturedCategory?: string | null;
  capturedSpec?: string | null;
  capturedUnit?: string | null;
  memo?: string | null;
  rawPayload?: Record<string, unknown> | null;
  submittedAt?: string | null;
  createdAt: string;
  updatedAt?: string | null;
}

export interface CreateDraftPayload {
  sourceApp?: 'mobile_app';
  identifierType?: string;
  identifierValue?: string;
  capturedName?: string;
  capturedManufacturer?: string;
  capturedSpec?: string;
  capturedUnit?: string;
  memo?: string;
  rawPayload?: Record<string, unknown>;
}

interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  error?: string;
}

const BASE = '/api/v1/mobile/product-drafts';

export async function createDraft(payload: CreateDraftPayload): Promise<MobileProductDraft> {
  const res = await apiClient.post<ApiEnvelope<MobileProductDraft>>(BASE, {
    sourceApp: 'mobile_app',
    ...payload,
  });
  if (!res.data?.success || !res.data.data) {
    throw new Error(res.data?.error ?? 'DRAFT_CREATE_FAILED');
  }
  return res.data.data;
}

export async function listDrafts(params?: {
  status?: MobileDraftStatus;
  page?: number;
  limit?: number;
}): Promise<{ items: MobileProductDraft[]; total: number }> {
  const res = await apiClient.get<ApiEnvelope<{ items: MobileProductDraft[]; total: number }>>(BASE, {
    params,
  });
  return res.data?.data ?? { items: [], total: 0 };
}

export async function getDraft(id: string): Promise<MobileProductDraft> {
  const res = await apiClient.get<ApiEnvelope<MobileProductDraft>>(`${BASE}/${id}`);
  if (!res.data?.success || !res.data.data) {
    throw new Error(res.data?.error ?? 'DRAFT_NOT_FOUND');
  }
  return res.data.data;
}

export async function submitDraft(id: string): Promise<MobileProductDraft> {
  const res = await apiClient.post<ApiEnvelope<MobileProductDraft>>(`${BASE}/${id}/submit`, {});
  if (!res.data?.success || !res.data.data) {
    throw new Error(res.data?.error ?? 'DRAFT_SUBMIT_FAILED');
  }
  return res.data.data;
}

/** 상태 한글 라벨 (draft = 작성 중 / submitted = 제출됨 …) */
export const DRAFT_STATUS_LABEL: Record<MobileDraftStatus, string> = {
  draft: '작성 중',
  submitted: '제출됨',
  candidate_created: '후보 생성됨',
  reviewed: '검토 완료',
  rejected: '반려',
  archived: '보관',
};
