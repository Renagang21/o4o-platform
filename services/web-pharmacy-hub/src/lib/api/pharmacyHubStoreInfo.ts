/**
 * Pharmacy-Hub 매장 정보 API 클라이언트
 *
 * WO-PHARMACY-HUB-STORE-INFO-AND-ACCOUNT-V1
 *
 * 계약 (backend: controllers/pharmacy-hub/PharmacyHubStoreInfoController.ts):
 *   GET   /pharmacy-hub/store-owner/info
 *   PATCH /pharmacy-hub/store-owner/info
 *
 * ⚠️ organizationId 는 **보내지 않는다.**
 *   대상 조직은 서버가 인증 사용자 + Pharmacy-Hub enrollment 로 다시 결정한다.
 *   응답의 organizationId 는 표시·디버그용이며, 저장 대상 선택 근거가 아니다.
 *   (서버는 allowlist 밖 키를 400 FIELD_NOT_EDITABLE 로 거부한다.)
 */
import { api } from '../apiClient';

const BASE = '/pharmacy-hub/store-owner';

function unwrap<T>(body: any, fallbackMessage: string): T {
  if (!body?.success) {
    throw new Error(body?.error || fallbackMessage);
  }
  return body.data as T;
}

/** organizations.address_detail 구조화 주소 */
export interface StoreAddressDetail {
  zipCode?: string;
  baseAddress?: string;
  detailAddress?: string;
  region?: string;
}

/**
 * 매장 조직 해석 결과 (홈 요약과 동일한 해석기 · 동일한 의미)
 *   connected     : Pharmacy-Hub active enrollment 조직이 정확히 1개
 *   not_connected : 0개 — 안내만 표시하고 다른 서비스 조직으로 대체하지 않는다
 *   ambiguous     : 2개 이상 — 임의 선택 없이 운영자 확인 안내
 */
export interface StoreInfoStore {
  status: 'connected' | 'not_connected' | 'ambiguous';
  candidateCount: number;
  errorCode?: 'AMBIGUOUS_STORE_CONNECTION';
  organizationId: string | null;
  name: string | null;
  code: string | null;
  address: string | null;
  addressDetail: StoreAddressDetail | null;
  phone: string | null;
  businessNumber: string | null;
  description: string | null;
  isActive: boolean | null;
  updatedAt: string | null;
}

export interface StoreInfo {
  store: StoreInfoStore;
  enrollment: { serviceCode: string; status: string; enrolledAt: string | null } | null;
  publicStore: { slug: string | null; isActive: boolean | null } | null;
  /** 서버가 허용하는 수정 필드 — 화면의 입력 가능 여부는 이 목록을 따른다. */
  editableFields: string[];
}

/** PATCH 본문 — 서버 allowlist 와 동일 집합. 이 밖의 키는 서버가 거부한다. */
export interface StoreInfoPatch {
  name?: string | null;
  phone?: string | null;
  address?: string | null;
  addressDetail?: StoreAddressDetail | null;
  description?: string | null;
}

export async function fetchStoreInfo(): Promise<StoreInfo> {
  const res = await api.get(`${BASE}/info`);
  return unwrap<StoreInfo>(res.data, '매장 정보를 불러오지 못했습니다.');
}

export async function updateStoreInfo(patch: StoreInfoPatch): Promise<StoreInfo> {
  const res = await api.patch(`${BASE}/info`, patch);
  return unwrap<StoreInfo>(res.data, '매장 정보를 저장하지 못했습니다.');
}
