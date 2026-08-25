/**
 * Pharmacy-Hub 파트너별 제휴 QR API 클라이언트
 *
 * WO-O4O-PHARMACYHUB-COMMUNITY-AND-MY-STORE-FULL-PARITY-CLOSURE-V1 §8 (#79)
 *
 * backend = 공통 /api/v1/foreign-visitor (partners/:partnerId/qr-codes, partner-qr-codes/:id...).
 * shortCode / landingUrl 은 **서버가** 생성한다 — PH landing origin 을
 * foreign-visitor-partner-qr-code.service 의 PUBLIC_WEB_ORIGIN_BY_SERVICE 에 등록했으므로
 * pharmacyhub.co.kr 로 떨어진다(서비스 경계 유지).
 * SVG 는 image/svg+xml 이라 JSON 인스턴스 대신 raw fetch 로 받는다.
 */
import { getAccessToken } from '@o4o/auth-client';
import { api, API_BASE_URL } from '../apiClient';

const SERVICE_KEY = 'pharmacy-hub';

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
  /** 목록 batch count (유입 신호) */
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

function unwrapOne(body: any, fallback: string): ForeignVisitorPartnerQrCode {
  if (!body?.success || !body?.data) throw new Error(body?.error || fallback);
  return body.data as ForeignVisitorPartnerQrCode;
}

/** 파트너별 QR 목록. */
export async function getPartnerQrCodes(
  partnerId: string,
  params: { status?: ForeignVisitorQrStatus; search?: string } = {},
): Promise<ForeignVisitorPartnerQrCode[]> {
  const res = await api.get(`/foreign-visitor/partners/${encodeURIComponent(partnerId)}/qr-codes`, {
    params: { serviceKey: SERVICE_KEY, limit: 100, ...params },
  });
  return res.data?.data ?? [];
}

/** QR 발급 (이용권 ACTIVE 필요). */
export async function createPartnerQrCode(
  partnerId: string,
  payload: QrWritePayload,
): Promise<ForeignVisitorPartnerQrCode> {
  const res = await api.post(`/foreign-visitor/partners/${encodeURIComponent(partnerId)}/qr-codes`, {
    serviceKey: SERVICE_KEY,
    ...payload,
  });
  return unwrapOne(res.data, 'QR 발급에 실패했습니다.');
}

/** QR 수정. */
export async function updatePartnerQrCode(
  qrCodeId: string,
  payload: Partial<QrWritePayload>,
): Promise<ForeignVisitorPartnerQrCode> {
  const res = await api.patch(`/foreign-visitor/partner-qr-codes/${encodeURIComponent(qrCodeId)}`, {
    serviceKey: SERVICE_KEY,
    ...payload,
  });
  return unwrapOne(res.data, 'QR 수정에 실패했습니다.');
}

/** QR 상태 변경. */
export async function updatePartnerQrCodeStatus(
  qrCodeId: string,
  status: ForeignVisitorQrStatus,
): Promise<ForeignVisitorPartnerQrCode> {
  const res = await api.patch(
    `/foreign-visitor/partner-qr-codes/${encodeURIComponent(qrCodeId)}/status`,
    { serviceKey: SERVICE_KEY, status },
  );
  return unwrapOne(res.data, '상태 변경에 실패했습니다.');
}

/** QR SVG (image/svg+xml, Bearer 인증 — raw fetch). */
export async function getPartnerQrSvg(qrCodeId: string, size = 512): Promise<string> {
  const url =
    `${API_BASE_URL}/api/v1/foreign-visitor/partner-qr-codes/${encodeURIComponent(qrCodeId)}/svg` +
    `?serviceKey=${encodeURIComponent(SERVICE_KEY)}&size=${encodeURIComponent(String(size))}`;
  const token = getAccessToken();
  const res = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  if (!res.ok) throw new Error('QR 이미지를 불러오지 못했습니다.');
  return res.text();
}
