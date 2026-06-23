/**
 * Foreign Visitor Partner QR Code API client (KPA-Society 매장 측)
 * WO-O4O-FOREIGN-VISITOR-AFFILIATE-QR-TEMPLATE-V1
 *
 * backend: /api/v1/foreign-visitor (partners/:partnerId/qr-codes, partner-qr-codes/:id...).
 * 파트너별 제휴마케팅 QR 발급/조회/수정/상태변경 + SVG. 쓰기는 FOREIGN_VISITOR_SALES_SUPPORT ACTIVE 필요.
 * SVG 는 image/svg+xml(Bearer 인증) 이라 coreApiClient(JSON) 대신 raw fetch.
 */
import { coreApiClient } from './client';
import { getAccessToken } from '../contexts/AuthContext';

const SERVICE_KEY = 'kpa';

export type ForeignVisitorQrStatus = 'ACTIVE' | 'INACTIVE';

export interface ForeignVisitorPartnerQrCode {
  id: string;
  organizationId: string;
  serviceKey: string;
  partnerId: string;
  qrTemplateType: string;
  qrCodeName: string;
  campaignName?: string | null;
  landingUrl: string;
  shortCode: string;
  language?: string | null;
  status: ForeignVisitorQrStatus;
  validFrom?: string | null;
  validTo?: string | null;
  createdAt: string;
  updatedAt: string;
  // WO-O4O-FOREIGN-VISITOR-AFFILIATE-QR-SCAN-EVENT-V1: 목록 batch count(유입 신호)
  scanCount?: number;
  lastScannedAt?: string | null;
}

export interface QrWritePayload {
  qrCodeName: string;
  campaignName?: string | null;
  language?: string | null;
  validFrom?: string | null;
  validTo?: string | null;
  status?: ForeignVisitorQrStatus;
}

interface ListEnvelope {
  success: boolean;
  data?: ForeignVisitorPartnerQrCode[];
  error?: string;
}
interface OneEnvelope {
  success: boolean;
  data?: ForeignVisitorPartnerQrCode;
  error?: string;
}

/** 파트너별 QR 목록. */
export async function getPartnerQrCodes(
  partnerId: string,
  params: { status?: ForeignVisitorQrStatus; search?: string } = {},
): Promise<ForeignVisitorPartnerQrCode[]> {
  const query: Record<string, string | number | boolean | undefined> = { serviceKey: SERVICE_KEY, limit: 100 };
  if (params.status) query.status = params.status;
  if (params.search) query.search = params.search;
  const body = await coreApiClient.get<ListEnvelope>(
    `/foreign-visitor/partners/${encodeURIComponent(partnerId)}/qr-codes`,
    query,
  );
  return body?.data ?? [];
}

/** QR 생성 (쓰기 — entitlement ACTIVE 필요). */
export async function createPartnerQrCode(partnerId: string, payload: QrWritePayload): Promise<ForeignVisitorPartnerQrCode> {
  const body = await coreApiClient.post<OneEnvelope>(
    `/foreign-visitor/partners/${encodeURIComponent(partnerId)}/qr-codes`,
    { serviceKey: SERVICE_KEY, ...payload },
  );
  if (!body?.success || !body.data) throw new Error(body?.error || 'QR 발급에 실패했습니다.');
  return body.data;
}

/** QR 수정 (쓰기). */
export async function updatePartnerQrCode(qrCodeId: string, payload: Partial<QrWritePayload>): Promise<ForeignVisitorPartnerQrCode> {
  const body = await coreApiClient.patch<OneEnvelope>(
    `/foreign-visitor/partner-qr-codes/${encodeURIComponent(qrCodeId)}`,
    { serviceKey: SERVICE_KEY, ...payload },
  );
  if (!body?.success || !body.data) throw new Error(body?.error || 'QR 수정에 실패했습니다.');
  return body.data;
}

/** QR 상태 변경. */
export async function updatePartnerQrCodeStatus(qrCodeId: string, status: ForeignVisitorQrStatus): Promise<ForeignVisitorPartnerQrCode> {
  const body = await coreApiClient.patch<OneEnvelope>(
    `/foreign-visitor/partner-qr-codes/${encodeURIComponent(qrCodeId)}/status`,
    { serviceKey: SERVICE_KEY, status },
  );
  if (!body?.success || !body.data) throw new Error(body?.error || '상태 변경에 실패했습니다.');
  return body.data;
}

/** QR SVG 조회 (image/svg+xml, Bearer 인증 — raw fetch). */
export async function getPartnerQrSvg(qrCodeId: string, size = 512): Promise<string> {
  const base = import.meta.env.VITE_API_BASE_URL ? `${import.meta.env.VITE_API_BASE_URL}/api/v1` : '/api/v1';
  const url = new URL(`${base}/foreign-visitor/partner-qr-codes/${encodeURIComponent(qrCodeId)}/svg`, window.location.origin);
  url.searchParams.set('serviceKey', SERVICE_KEY);
  url.searchParams.set('size', String(size));
  const token = getAccessToken();
  const res = await fetch(url.toString(), {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error('QR 이미지를 불러오지 못했습니다.');
  return res.text();
}
