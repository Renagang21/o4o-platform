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
import type { QrScreenSet } from '@o4o/tablet-kiosk-core';
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
  title: string;
  description: string | null;
  libraryItemId: string | null;
  landingType: string;
  landingTargetId: string | null;
  /**
   * WO-O4O-STORE-QR-CANONICAL-TARGET-CONTENT-SOURCE-AND-KPA-PH-COMMONIZATION-V1:
   *   canonical 대상 축(PRODUCT|CONTENT|SCREEN_SET|EXTERNAL_LINK). 서버가 landingType 에서 파생한다.
   *   DEAD residue 이던 `type` 은 이 계약에서 제거했다 — KPA 와 같은 의미만 남긴다.
   */
  targetKind?: string | null;
  /** 내용의 원천. null = 판정 보류(HOLD) — 추측해서 표시하지 않는다. */
  contentSource?: string | null;
  slug: string;
  isActive: boolean;
  scanCount: number;
  /** 코너 QR(screen_set) 전용 — 태블릿 축이 자동 발급한 QR 도 같은 목록에 나온다. */
  screenSetId?: string | null;
  screenSetStatus?: 'active' | 'archived' | null;
  /** 공개 /qr/:slug 가 실제로 열리는가(서버 판정). */
  landable?: boolean;
  createdAt: string;
  updatedAt: string;
  consultationCtaEnabled: boolean;
  consultationCtaLabel: string | null;
  // WO-O4O-STORE-EXECUTION-HOME-TABLET-QR-V1 (additive · 백엔드 무변경):
  //   `store-qr.service.ts` 는 이미 두 값을 내려주고 있었는데 프론트 타입만 비어 있었다.
  //   배치(placement)는 대상(targetKind)과 **다른 축**이다 — 어디에 붙어 있는지를 말한다.
  /** 활성 배치의 대표값. null = 배치 0곳, 'MULTIPLE' = 2곳 이상(위치를 단정하지 않는다). */
  primaryPlacement?: string | null;
  /** 활성 배치 수. */
  activePlacementCount?: number;
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

export async function fetchStoreQrCodes(params?: {
  page?: number;
  limit?: number;
  /** 내린 QR 도 함께 받는다 — 목록에 남아야 다시 올릴 수 있다. */
  includeInactive?: boolean;
}): Promise<StoreQrPage> {
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

/** 내리기(soft). 공개 랜딩은 즉시 404 가 되지만 주소·연결 대상은 그대로 남는다. */
export async function deactivateStoreQrCode(id: string): Promise<void> {
  const res = await api.delete(`${BASE}/${id}`);
  unwrap<unknown>(res.data, 'QR 을 내리지 못했습니다.');
}

/** 다시 올리기. is_active 만 되돌린다 — 이미 인쇄된 QR 이 같은 곳을 다시 연다. */
export async function reactivateStoreQrCode(id: string): Promise<void> {
  const res = await api.post(`${BASE}/${id}/reactivate`, {});
  unwrap<unknown>(res.data, 'QR 을 다시 올리지 못했습니다.');
}

export async function fetchQrAnalytics(id: string): Promise<QrAnalytics> {
  const res = await api.get(`${BASE}/${id}/analytics`);
  return unwrap<QrAnalytics>(res.data, '스캔 통계를 불러오지 못했습니다.');
}

// ── QR 사용처(Placement) — WO-O4O-STORE-QR-PLACEMENT-AND-ANALYTICS-IMPLEMENTATION-V1 §7·§15 ──
//   KPA 와 **동일 계약**이다. 다른 것은 경로 prefix 뿐(유일한 정당한 서비스 차이).

export interface StoreQrPlacementDto {
  id: string;
  qrCodeId: string;
  placement: string;
  label: string | null;
  cornerRef: string | null;
  status: 'active' | 'ended';
  startedAt: string;
  endedAt: string | null;
}

export interface QrPlacementScanRow { placement: string; label: string | null; scans: number }

export async function listQrPlacements(
  qrId: string,
): Promise<{ items: StoreQrPlacementDto[]; activeCount: number }> {
  const res = await api.get(`${BASE}/${qrId}/placements`);
  return unwrap<{ items: StoreQrPlacementDto[]; activeCount: number }>(res.data, '사용처를 불러오지 못했습니다.');
}

export async function startQrPlacement(
  qrId: string,
  body: { placement: string; label?: string; cornerRef?: string; endOthers?: boolean },
): Promise<{ placement: StoreQrPlacementDto; primaryPlacement: string | null }> {
  const res = await api.post(`${BASE}/${qrId}/placements`, body);
  return unwrap(res.data, '배치를 시작하지 못했습니다.');
}

export async function endQrPlacement(
  qrId: string,
  placementId: string,
): Promise<{ placement: StoreQrPlacementDto; primaryPlacement: string | null }> {
  const res = await api.post(`${BASE}/${qrId}/placements/${placementId}/end`, {});
  return unwrap(res.data, '배치를 종료하지 못했습니다.');
}

export async function fetchQrPlacementAnalytics(
  qrId: string,
): Promise<{ byPlacement: QrPlacementScanRow[] }> {
  const res = await api.get(`${BASE}/${qrId}/placement-analytics`);
  return unwrap(res.data, '사용처 통계를 불러오지 못했습니다.');
}

export interface StoreQrPlacementAnalyticsDto {
  byPlacement: QrPlacementScanRow[];
  byContentSource: Array<{ contentSource: string | null; scans: number }>;
  byTargetKind: Array<{ landingType: string | null; scans: number }>;
  totalScans: number;
}

/** 매장 전체 스캔 분포(사용처/콘텐츠 출처/대상 3축) — §13. */
export async function fetchStorePlacementAnalytics(
  days?: number | null,
): Promise<StoreQrPlacementAnalyticsDto> {
  const res = await api.get(`/pharmacy-hub/store-owner/qr-analytics/placements${days ? `?days=${days}` : ''}`);
  return unwrap(res.data, '스캔 분포를 불러오지 못했습니다.');
}

/** 같은 콘텐츠로 QR 추가 — target 축 복제 + 새 slug (§8). */
export async function cloneQrCode(
  qrId: string,
  body?: { title?: string; placement?: string; label?: string },
): Promise<{ qr: StoreQrCode; placement: StoreQrPlacementDto | null }> {
  const res = await api.post(`${BASE}/${qrId}/clone`, body ?? {});
  return unwrap(res.data, 'QR 을 추가하지 못했습니다.');
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
  /**
   * WO-O4O-STORE-QR-CANONICAL-ADOPTED-IMPLEMENTATION-GAP-AUDIT-AND-PH-SCREENSET-FINAL-CLOSURE-V1:
   *   landingType='screen_set' (targetKind=SCREEN_SET · contentSource=TABLET_SCREEN_SET) 일 때
   *   공용 `resolvePublicQrLanding` 이 태블릿과 **같은 원본 sections** 를 내려준다.
   *   백엔드는 처음부터 이 payload 를 보내고 있었고, 빠져 있던 것은 PH 프론트의 소비뿐이었다.
   */
  screenSet?: QrScreenSet | null;
}

export type { QrScreenSet };

/** 공개 QR 랜딩 조회. 스캔 이벤트는 서버가 이 호출로 기록한다. */
export async function fetchPublicQrLanding(slug: string): Promise<PublicQrLanding> {
  const res = await api.get(`/pharmacy-hub/qr/public/${encodeURIComponent(slug)}`);
  return unwrap<PublicQrLanding>(res.data, 'QR 정보를 불러오지 못했습니다.');
}
