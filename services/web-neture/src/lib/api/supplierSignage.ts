/**
 * Supplier Digital Signage API client — 공급자 사이니지 제작·게시·보관
 *
 * WO-O4O-NETURE-SUPPLIER-DIGITAL-SIGNAGE-AUTHORING-HUB-IMPORT-V1
 *
 * Base: /api/v1/kpa/supplier/signage/media  (supplier-signage-media.controller.ts)
 *   서버가 소유권을 neture_suppliers(user_id, ACTIVE) + createdByUserId 로 격리하고
 *   source='supplier' · serviceKey='kpa-society' 원본만 다룬다.
 *   게시(active) 시 기존 KPA 매장 HUB(signage 축)·asset-snapshot 복사 경로에 그대로 노출된다.
 *
 * 경로가 /neture/* 가 아니라 /kpa/* 인 이유: 공급자 사이니지의 소비처가 KPA 매장 HUB
 * (serviceKey='kpa-society')이기 때문 — supplierScreenSets.ts 와 동일한 확정 컨벤션.
 */
import { api } from '../apiClient';

const BASE = '/kpa/supplier/signage/media';

export type SupplierSignageStatus = 'draft' | 'active' | 'archived';

export interface SupplierSignageMedia {
  id: string;
  serviceKey: string;
  name: string;
  description: string | null;
  mediaType: string;
  sourceType: 'youtube' | 'vimeo';
  sourceUrl: string;
  embedId: string | null;
  thumbnailUrl: string | null;
  tags: string[];
  status: SupplierSignageStatus;
  source: 'supplier';
  scope: 'global';
  createdByUserId: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface SupplierSignageInput {
  name: string;
  description?: string | null;
  sourceUrl: string;
  thumbnailUrl?: string | null;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

function normalizeError(e: any): never {
  const data = e?.response?.data;
  const err: any = new Error(data?.error || data?.message || e?.message || '네트워크 오류가 발생했습니다.');
  err.status = e?.response?.status;
  err.code = data?.code;
  throw err;
}

async function call<T>(fn: () => Promise<{ data: any }>): Promise<T> {
  try {
    const res = await fn();
    return res.data?.data as T;
  } catch (e: any) {
    normalizeError(e);
  }
}

/**
 * WO-O4O-NETURE-SUPPLIER-REMAINING-LOAD-ERROR-CONTRACT-V1 (묶음 4)
 *
 * 조회 실패는 고정 코드로 전파한다. 서버 원문은 console 로만 남긴다.
 * `call()` 은 4xx/5xx/네트워크 오류를 이미 throw 하지만, 200 이면서 `data` 가
 * 배열이 아닌 경우 `undefined` 를 그대로 반환해 목록이 "정상 0건" 처럼 흐른다
 * (소비 화면에서 `.length` 접근 시 크래시 위험). 목록 함수에서만 배열 검증을
 * 추가한다 (공통 `call()` 은 변경하지 않는다 — supplierScreenSets.ts 와 동일 규칙).
 */
export const SUPPLIER_SIGNAGE_LOAD_FAILED = 'SUPPLIER_SIGNAGE_LOAD_FAILED';

export async function fetchSupplierSignageList(): Promise<SupplierSignageMedia[]> {
  let rows: SupplierSignageMedia[];
  try {
    rows = await call<SupplierSignageMedia[]>(() => api.get(BASE));
  } catch (error) {
    console.warn('[Supplier Signage API] Failed to fetch signage list:', (error as Error)?.message);
    throw new Error(SUPPLIER_SIGNAGE_LOAD_FAILED);
  }
  if (!Array.isArray(rows)) {
    console.warn('[Supplier Signage API] Unexpected signage list payload shape');
    throw new Error(SUPPLIER_SIGNAGE_LOAD_FAILED);
  }
  return rows;
}

export function createSupplierSignage(input: SupplierSignageInput): Promise<SupplierSignageMedia> {
  return call<SupplierSignageMedia>(() => api.post(BASE, input));
}

export function updateSupplierSignage(id: string, patch: Partial<SupplierSignageInput>): Promise<SupplierSignageMedia> {
  return call<SupplierSignageMedia>(() => api.patch(`${BASE}/${id}`, patch));
}

export function publishSupplierSignage(id: string): Promise<SupplierSignageMedia> {
  return call<SupplierSignageMedia>(() => api.post(`${BASE}/${id}/publish`));
}

export function archiveSupplierSignage(id: string): Promise<SupplierSignageMedia> {
  return call<SupplierSignageMedia>(() => api.post(`${BASE}/${id}/archive`));
}

export function unarchiveSupplierSignage(id: string): Promise<SupplierSignageMedia> {
  return call<SupplierSignageMedia>(() => api.post(`${BASE}/${id}/unarchive`));
}

export function removeSupplierSignage(id: string): Promise<{ deleted: boolean; id: string }> {
  return call<{ deleted: boolean; id: string }>(() => api.delete(`${BASE}/${id}`));
}
