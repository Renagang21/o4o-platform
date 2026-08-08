/**
 * Pharmacy-Hub 상품 설명서 API 클라이언트 (조회 전용)
 *
 * WO-PHARMACY-HUB-STORE-EXECUTION-ASSETS-V1 (범위 E)
 *
 * 계약 (backend: controllers/pharmacy-hub/PharmacyHubStoreManualController.ts):
 *   GET  /pharmacy-hub/store-owner/manuals
 *   GET  /pharmacy-hub/store-owner/manuals/:listingId?locale=ko
 *   POST /pharmacy-hub/store-owner/manuals/:listingId/qr    (상품 QR 멱등 발급)
 *
 * canonical = shared_product_descriptions (description_type='STORE', status='canonical').
 * **설명서를 새로 만들거나 번역하지 않는다** — 저작 경로가 없다.
 */
import { api } from '../apiClient';
import type { StoreConnectionState } from '../../components/store-owner/StoreConnectionNotice';

const BASE = '/pharmacy-hub/store-owner/manuals';

function unwrap<T>(body: any, fallbackMessage: string): T {
  if (!body?.success) {
    throw new Error(body?.error || fallbackMessage);
  }
  return body.data as T;
}

export interface ManualListItem {
  listingId: string;
  masterId: string;
  name: string;
  brandName: string | null;
  regulatoryType: string | null;
  /** canonical STORE 설명서가 존재하는 언어 (ko 우선 정렬) */
  languages: string[];
  hasManual: boolean;
}

export interface ManualListPage {
  storeConnection: StoreConnectionState;
  items: ManualListItem[];
  page: number;
  limit: number;
  total: number;
}

export interface ManualDetail {
  storeConnection: StoreConnectionState;
  product: { listingId: string; masterId: string | null; name: string | null; brandName: string | null } | null;
  manual: {
    hasCanonical: boolean;
    languages: string[];
    locale: string | null;
    summary: string | null;
    /** 설명서 본문 HTML */
    content: string | null;
    sourceType?: string | null;
    updatedAt?: string | null;
  } | null;
  /** 이미 발급된 상품 Landing QR (없으면 null — 조회는 발급하지 않는다) */
  landing: { publicKey: string; url: string } | null;
}

export interface ProductQr {
  publicKey: string;
  url: string;
  /** QR 이미지는 저장하지 않고 요청 시 인코딩한다 (F12 불변식 ④) */
  svg: string;
  created: boolean;
}

export async function fetchManuals(params?: {
  page?: number;
  limit?: number;
  search?: string;
}): Promise<ManualListPage> {
  const res = await api.get(BASE, { params });
  return unwrap<ManualListPage>(res.data, '설명서 목록을 불러오지 못했습니다.');
}

export async function fetchManualDetail(listingId: string, locale?: string): Promise<ManualDetail> {
  const res = await api.get(`${BASE}/${listingId}`, { params: locale ? { locale } : undefined });
  return unwrap<ManualDetail>(res.data, '설명서를 불러오지 못했습니다.');
}

/** 상품 QR 발급·조회 (멱등 — 같은 상품이면 항상 같은 QR). */
export async function issueProductQr(listingId: string): Promise<ProductQr> {
  const res = await api.post(`${BASE}/${listingId}/qr`, {});
  return unwrap<ProductQr>(res.data, '상품 QR 을 발급하지 못했습니다.');
}
