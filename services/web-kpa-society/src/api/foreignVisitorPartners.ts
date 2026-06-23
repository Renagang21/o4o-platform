/**
 * Foreign Visitor Partner API client (KPA-Society 매장 측)
 * WO-O4O-FOREIGN-VISITOR-PARTNER-MANAGEMENT-UI-V1
 *
 * backend: /api/v1/foreign-visitor/partners (WO-O4O-FOREIGN-VISITOR-PARTNER-MODEL-V1).
 * 외국인 관광객 "유입 파트너"(여행사/가이드/호텔/인솔자/코디네이터) 등록·조회·수정·상태변경.
 * 쓰기(POST/PATCH/status)는 backend 에서 FOREIGN_VISITOR_SALES_SUPPORT ACTIVE 이용권 필요(403 ENTITLEMENT_REQUIRED).
 *
 * coreApiClient 사용 — /foreign-visitor 는 /api/v1 (kpa 네임스페이스 밖). serviceKey='kpa' 주입.
 */
import { coreApiClient } from './client';

const SERVICE_KEY = 'kpa';

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

export interface ListParams {
  status?: ForeignVisitorPartnerStatus;
  partnerType?: ForeignVisitorPartnerType;
  search?: string;
  page?: number;
  limit?: number;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface ListEnvelope {
  success: boolean;
  data?: ForeignVisitorPartner[];
  pagination?: Pagination;
  error?: string;
}
interface OneEnvelope {
  success: boolean;
  data?: ForeignVisitorPartner;
  error?: string;
}

/** 목록 조회 (entitlement 불요). */
export async function getForeignVisitorPartners(
  params: ListParams = {},
): Promise<{ items: ForeignVisitorPartner[]; pagination?: Pagination }> {
  const query: Record<string, string | number | boolean | undefined> = { serviceKey: SERVICE_KEY };
  if (params.status) query.status = params.status;
  if (params.partnerType) query.partnerType = params.partnerType;
  if (params.search) query.search = params.search;
  if (params.page) query.page = params.page;
  if (params.limit) query.limit = params.limit;
  const body = await coreApiClient.get<ListEnvelope>('/foreign-visitor/partners', query);
  return { items: body?.data ?? [], pagination: body?.pagination };
}

/** 단건 조회. */
export async function getForeignVisitorPartner(id: string): Promise<ForeignVisitorPartner> {
  const body = await coreApiClient.get<OneEnvelope>(
    `/foreign-visitor/partners/${encodeURIComponent(id)}`,
    { serviceKey: SERVICE_KEY },
  );
  if (!body?.success || !body.data) throw new Error(body?.error || '파트너 정보를 불러오지 못했습니다.');
  return body.data;
}

/** 생성 (쓰기 — entitlement ACTIVE 필요). */
export async function createForeignVisitorPartner(payload: PartnerWritePayload): Promise<ForeignVisitorPartner> {
  const body = await coreApiClient.post<OneEnvelope>('/foreign-visitor/partners', {
    serviceKey: SERVICE_KEY,
    ...payload,
  });
  if (!body?.success || !body.data) throw new Error(body?.error || '파트너 등록에 실패했습니다.');
  return body.data;
}

/** 수정 (쓰기). */
export async function updateForeignVisitorPartner(
  id: string,
  payload: Partial<PartnerWritePayload>,
): Promise<ForeignVisitorPartner> {
  const body = await coreApiClient.patch<OneEnvelope>(`/foreign-visitor/partners/${encodeURIComponent(id)}`, {
    serviceKey: SERVICE_KEY,
    ...payload,
  });
  if (!body?.success || !body.data) throw new Error(body?.error || '파트너 수정에 실패했습니다.');
  return body.data;
}

/** 상태 변경 (활성/비활성). */
export async function updateForeignVisitorPartnerStatus(
  id: string,
  status: ForeignVisitorPartnerStatus,
): Promise<ForeignVisitorPartner> {
  const body = await coreApiClient.patch<OneEnvelope>(
    `/foreign-visitor/partners/${encodeURIComponent(id)}/status`,
    { serviceKey: SERVICE_KEY, status },
  );
  if (!body?.success || !body.data) throw new Error(body?.error || '상태 변경에 실패했습니다.');
  return body.data;
}
