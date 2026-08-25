/**
 * Pharmacy-Hub 외국인 여행객 유입 파트너 API 클라이언트
 *
 * WO-O4O-PHARMACYHUB-COMMUNITY-AND-MY-STORE-FULL-PARITY-CLOSURE-V1 §8 (#79)
 *
 * backend 는 KPA / GlycoPharm / K-Cosmetics 와 **완전히 동일한 공통 모듈**이다:
 *   /api/v1/foreign-visitor/partners (WO-O4O-FOREIGN-VISITOR-PARTNER-MODEL-V1).
 * 이번 WO 는 그 모듈의 serviceKey allowlist 에 'pharmacy-hub' 를 더했을 뿐이며
 * 분기·복제·신규 table 은 없다. 조직 해석은 서버의 isStoreOwner(serviceKey) 가 한다
 * — client 는 organizationId 를 보내지 않는다.
 *
 * 쓰기(POST/PATCH)는 FOREIGN_VISITOR_SALES_SUPPORT ACTIVE 이용권이 필요하다
 * (403 ENTITLEMENT_REQUIRED). 조회는 이용권 없이도 열린다.
 */
import { api } from '../apiClient';

const SERVICE_KEY = 'pharmacy-hub';
const BASE = '/foreign-visitor/partners';

export type ForeignVisitorPartnerType =
  | 'TRAVEL_AGENCY'
  | 'GUIDE'
  | 'HOTEL'
  | 'BUS_OPERATOR'
  | 'MEDICAL_TOUR_COORDINATOR'
  | 'OTHER';

export type ForeignVisitorPartnerStatus = 'ACTIVE' | 'INACTIVE';

export const PARTNER_TYPE_LABELS: Record<ForeignVisitorPartnerType, string> = {
  TRAVEL_AGENCY: '여행사',
  GUIDE: '가이드',
  HOTEL: '호텔/숙박업소',
  BUS_OPERATOR: '관광버스/인솔자',
  MEDICAL_TOUR_COORDINATOR: '의료관광 코디네이터',
  OTHER: '기타',
};

export const PARTNER_TYPE_OPTIONS: ForeignVisitorPartnerType[] = [
  'TRAVEL_AGENCY',
  'GUIDE',
  'HOTEL',
  'BUS_OPERATOR',
  'MEDICAL_TOUR_COORDINATOR',
  'OTHER',
];

export const PARTNER_STATUS_LABELS: Record<ForeignVisitorPartnerStatus, string> = {
  ACTIVE: '활성',
  INACTIVE: '비활성',
};

export interface ForeignVisitorPartner {
  id: string;
  serviceKey: string;
  organizationId: string;
  partnerType: ForeignVisitorPartnerType;
  partnerName: string;
  contactName?: string | null;
  contactPhone?: string | null;
  contactEmail?: string | null;
  status: ForeignVisitorPartnerStatus;
  memo?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PartnerWritePayload {
  partnerType: ForeignVisitorPartnerType;
  partnerName: string;
  contactName?: string | null;
  contactPhone?: string | null;
  contactEmail?: string | null;
  memo?: string | null;
  status?: ForeignVisitorPartnerStatus;
}

export interface PartnerListParams {
  status?: ForeignVisitorPartnerStatus;
  partnerType?: ForeignVisitorPartnerType;
  search?: string;
  page?: number;
  limit?: number;
}

export interface PartnerPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

function unwrapOne(body: any, fallback: string): ForeignVisitorPartner {
  if (!body?.success || !body?.data) throw new Error(body?.error || fallback);
  return body.data as ForeignVisitorPartner;
}

/** 목록 조회 (이용권 불요). */
export async function getForeignVisitorPartners(
  params: PartnerListParams = {},
): Promise<{ items: ForeignVisitorPartner[]; pagination?: PartnerPagination }> {
  const res = await api.get(BASE, { params: { serviceKey: SERVICE_KEY, ...params } });
  return { items: res.data?.data ?? [], pagination: res.data?.pagination };
}

/** 단건 조회. */
export async function getForeignVisitorPartner(id: string): Promise<ForeignVisitorPartner> {
  const res = await api.get(`${BASE}/${encodeURIComponent(id)}`, {
    params: { serviceKey: SERVICE_KEY },
  });
  return unwrapOne(res.data, '파트너 정보를 불러오지 못했습니다.');
}

/** 생성 (이용권 ACTIVE 필요). */
export async function createForeignVisitorPartner(
  payload: PartnerWritePayload,
): Promise<ForeignVisitorPartner> {
  const res = await api.post(BASE, { serviceKey: SERVICE_KEY, ...payload });
  return unwrapOne(res.data, '파트너 등록에 실패했습니다.');
}

/** 수정 (이용권 ACTIVE 필요). */
export async function updateForeignVisitorPartner(
  id: string,
  payload: Partial<PartnerWritePayload>,
): Promise<ForeignVisitorPartner> {
  const res = await api.patch(`${BASE}/${encodeURIComponent(id)}`, {
    serviceKey: SERVICE_KEY,
    ...payload,
  });
  return unwrapOne(res.data, '파트너 수정에 실패했습니다.');
}

/** 상태 변경 (활성/비활성). */
export async function updateForeignVisitorPartnerStatus(
  id: string,
  status: ForeignVisitorPartnerStatus,
): Promise<ForeignVisitorPartner> {
  const res = await api.patch(`${BASE}/${encodeURIComponent(id)}/status`, {
    serviceKey: SERVICE_KEY,
    status,
  });
  return unwrapOne(res.data, '상태 변경에 실패했습니다.');
}
