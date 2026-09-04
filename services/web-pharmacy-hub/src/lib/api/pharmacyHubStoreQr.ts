/**
 * Pharmacy-Hub 매장 QR API 클라이언트
 *
 * WO-PHARMACY-HUB-STORE-EXECUTION-ASSETS-V1 (범위 A)
 *
 * 계약 (backend: controllers/pharmacy-hub/PharmacyHubStoreQrController.ts):
 *   GET    /pharmacy-hub/store-owner/qr
 *   GET    /pharmacy-hub/store-owner/qr/sources
 *   POST   /pharmacy-hub/store-owner/qr
 *   PUT    /pharmacy-hub/store-owner/qr/:id
 *   DELETE /pharmacy-hub/store-owner/qr/:id          (비활성화 — 물리 삭제 아님)
 *   GET    /pharmacy-hub/store-owner/qr/:id/analytics
 *   GET    /pharmacy-hub/store-owner/qr/:id/export   (파일 스트림)
 *   GET    /pharmacy-hub/qr/public/:slug             (공개 — 인증 없음)
 *
 * ⚠️ organizationId / slug 는 **보내지 않는다.** 매장은 서버가 enrollment 로 결정하고,
 *    slug 는 전역 unique 라 서버가 발급한다.
 *
 * 원장은 공통 `store_qr_codes` 다 — 신규 테이블 0.
 */
import { api } from '../apiClient';
import type { StoreConnectionState } from '../../components/store-owner/StoreConnectionNotice';

const BASE = '/pharmacy-hub/store-owner/qr';

function unwrap<T>(body: any, fallbackMessage: string): T {
  if (!body?.success) {
    throw new Error(body?.error || fallbackMessage);
  }
  return body.data as T;
}

/** Pharmacy-Hub V1 에서 만들 수 있는 연결 유형 (실제 랜딩이 존재하는 것만) */
export type QrLandingType = 'page' | 'product' | 'link';

export interface StoreQrCode {
  id: string;
  organizationId: string;
  type: string;
  title: string;
  description: string | null;
  libraryItemId: string | null;
  landingType: string;
  landingTargetId: string | null;
  slug: string;
  isActive: boolean;
  scanCount: number;
  createdAt: string;
  updatedAt: string;
  consultationCtaEnabled: boolean;
  consultationCtaLabel: string | null;
}

export interface StoreQrPage {
  storeConnection: StoreConnectionState;
  items: StoreQrCode[];
  page: number;
  limit: number;
  total: number;
  /** QR 이 가리키는 공개 주소의 origin (예: https://pharmacyhub.co.kr) */
  publicOrigin: string;
}

export interface QrSources {
  storeConnection: StoreConnectionState;
  libraryAssets: Array<{ id: string; title: string; assetType: string; category: string | null }>;
  storeContents: Array<{ id: string; title: string }>;
  products: Array<{ id: string; name: string; brandName: string | null }>;
}

export interface QrAnalytics {
  totalScans: number;
  todayScans: number;
  weeklyScans: number;
  deviceStats: Record<string, number>;
}

export interface CreateQrInput {
  title: string;
  description?: string;
  landingType: QrLandingType;
  /** landingType='page' 이고 자료함 자료를 고른 경우 */
  libraryItemId?: string;
  /** landingType='page'(매장 콘텐츠) · 'product'(경영활용 제품) · 'link'(https URL) */
  landingTargetId?: string;
  consultationCtaEnabled?: boolean;
  consultationCtaLabel?: string;
}

export async function fetchStoreQrCodes(params?: { page?: number; limit?: number }): Promise<StoreQrPage> {
  const res = await api.get(BASE, { params });
  return unwrap<StoreQrPage>(res.data, 'QR 목록을 불러오지 못했습니다.');
}

export async function fetchQrSources(): Promise<QrSources> {
  const res = await api.get(`${BASE}/sources`);
  return unwrap<QrSources>(res.data, '연결 대상을 불러오지 못했습니다.');
}

export async function createStoreQrCode(input: CreateQrInput): Promise<StoreQrCode> {
  const res = await api.post(BASE, input);
  return unwrap<StoreQrCode>(res.data, 'QR 을 만들지 못했습니다.');
}

/**
 * 이름·설명·상담 CTA 만 수정한다.
 * 연결 대상과 주소(slug)는 바꿀 수 없다 — 이미 인쇄·배포된 QR 이 조용히 다른 곳을 가리키면 안 된다.
 */
export async function updateStoreQrCode(
  id: string,
  input: { title?: string; description?: string; consultationCtaEnabled?: boolean; consultationCtaLabel?: string },
): Promise<StoreQrCode> {
  const res = await api.put(`${BASE}/${id}`, input);
  return unwrap<StoreQrCode>(res.data, 'QR 을 수정하지 못했습니다.');
}

/** 비활성화(soft delete). 공개 랜딩은 즉시 404 가 된다. */
export async function deactivateStoreQrCode(id: string): Promise<void> {
  const res = await api.delete(`${BASE}/${id}`);
  unwrap<unknown>(res.data, 'QR 을 내리지 못했습니다.');
}

export async function fetchQrAnalytics(id: string): Promise<QrAnalytics> {
  const res = await api.get(`${BASE}/${id}/analytics`);
  return unwrap<QrAnalytics>(res.data, '스캔 통계를 불러오지 못했습니다.');
}

export type QrExportFormat = 'png' | 'svg' | 'pdf';
export type QrExportPreset = 'small' | 'medium' | 'large' | 'a4' | 'a4_4up';

/**
 * QR 파일 다운로드. 응답은 파일 스트림이라 blob 으로 받아 브라우저 저장을 트리거한다.
 * 파일명은 서버가 Content-Disposition(제목 기반)으로 지정한다.
 */
export async function downloadQrExport(
  qr: { id: string; title: string },
  format: QrExportFormat,
  preset?: QrExportPreset,
): Promise<void> {
  const res = await api.get(`${BASE}/${qr.id}/export`, {
    params: { format, preset },
    responseType: 'blob',
  });
  const url = window.URL.createObjectURL(res.data as Blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${qr.title || 'qr'}.${format}`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

// ─── 공개 랜딩 (인증 없음) ────────────────────────────────────────────────────

export interface PublicQrLanding {
  id: string;
  title: string;
  description: string | null;
  landingType: string;
  landingTargetId: string | null;
  slug: string;
  storeSlug: string | null;
  consultationCtaEnabled: boolean;
  consultationCtaLabel: string | null;
  /**
   * WO-O4O-PHARMACYHUB-DEMO-ACCOUNT-AND-LOGIN-VERIFICATION-V1 (G1):
   *   descriptionHtml/descriptionSummary = 매장 내부용 설명서(SPD STORE/canonical/ko) — 태블릿 제품 버튼과 동일 원본.
   *   설명서가 없으면 null (기존 이름/브랜드/규격 카드만 표시).
   */
  productDetails: {
    name: string;
    brandName: string | null;
    price: number | null;
    description: string | null;
    descriptionHtml?: string | null;
    descriptionSummary?: string | null;
  } | null;
  videoUrl: string | null;
  pageContent: {
    available: true;
    title: string;
    summary: string | null;
    body: string | null;
    items: Array<{ key: string; name: string; descriptionHtml: string }>;
  } | null;
}

/** 공개 QR 랜딩 조회. 스캔 이벤트는 서버가 이 호출로 기록한다. */
export async function fetchPublicQrLanding(slug: string): Promise<PublicQrLanding> {
  const res = await api.get(`/pharmacy-hub/qr/public/${encodeURIComponent(slug)}`);
  return unwrap<PublicQrLanding>(res.data, 'QR 정보를 불러오지 못했습니다.');
}
