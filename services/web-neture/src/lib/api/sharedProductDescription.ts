/**
 * Shared Product Description API client — O4O 공용 상품설명 후보 정비
 *
 * WO-O4O-PRODUCT-DESCRIPTION-ADMIN-CURATION-V1
 * backend: /api/v1/admin/shared-product-descriptions
 *   (SHARED-CANDIDATE-STORAGE / CANDIDATE-SEED 에서 도입된 기존 API 재사용)
 *
 * 타입은 backend 엔티티(SharedProductDescription) 정렬. @o4o/types 미정의이므로 로컬 선언.
 */
import { api } from '../apiClient';

const BASE = '/admin/shared-product-descriptions';

export type SharedDescriptionStatus =
  | 'candidate'
  | 'canonical'
  | 'hidden'
  | 'needs_review'
  | 'deprecated';

export type SharedDescriptionSourceType =
  | 'supplier'
  | 'operator'
  | 'ai'
  | 'store_contribution'
  | 'drug_extension'
  | 'migration'
  | 'manual';

/** status API 로 직접 지정 가능한 상태 (canonical 은 전용 endpoint 사용) */
export type SharedDescriptionAssignableStatus = Exclude<SharedDescriptionStatus, 'canonical'>;

export type SharedDescriptionSeedSource = 'supplier' | 'ai' | 'drug_extension';

export interface SharedProductDescription {
  id: string;
  masterId: string;
  content: string;
  summary: string | null;
  sourceType: SharedDescriptionSourceType;
  sourceRefId: string | null;
  status: SharedDescriptionStatus;
  language: string | null;
  qualityScore: string | null;
  curatedBy: string | null;
  curatedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SharedDescriptionSeedResult {
  masterId: string;
  created: number;
  skipped: number;
  sources: {
    supplier?: { created: number; skipped: number };
    ai?: { created: number; skipped: number };
    drugExtension?: { created: number; skipped: number };
  };
}

export const sharedProductDescriptionApi = {
  async listByMaster(masterId: string): Promise<SharedProductDescription[]> {
    const res = await api.get(`${BASE}/by-master/${masterId}`);
    return res.data?.data ?? [];
  },

  async getCanonical(masterId: string): Promise<SharedProductDescription | null> {
    const res = await api.get(`${BASE}/by-master/${masterId}/canonical`);
    return res.data?.data ?? null;
  },

  async seed(
    masterId: string,
    sources?: SharedDescriptionSeedSource[],
  ): Promise<SharedDescriptionSeedResult> {
    const res = await api.post(`${BASE}/by-master/${masterId}/seed`, sources ? { sources } : {});
    return res.data?.data as SharedDescriptionSeedResult;
  },

  /** 대표 지정 — 전용 endpoint (기존 canonical 자동 강등, 1개/master 보장) */
  async setCanonical(id: string): Promise<SharedProductDescription> {
    const res = await api.patch(`${BASE}/${id}/canonical`);
    return res.data?.data as SharedProductDescription;
  },

  async setStatus(
    id: string,
    status: SharedDescriptionAssignableStatus,
  ): Promise<SharedProductDescription> {
    const res = await api.patch(`${BASE}/${id}/status`, { status });
    return res.data?.data as SharedProductDescription;
  },

  async remove(id: string): Promise<void> {
    await api.delete(`${BASE}/${id}`);
  },
};
