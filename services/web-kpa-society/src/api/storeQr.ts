/**
 * Store QR API Client
 *
 * WO-O4O-QR-LANDING-PAGE-V1
 * WO-O4O-QR-SCAN-ANALYTICS-V1
 *
 * QR 코드 CRUD + 공개 랜딩 데이터 조회 + 스캔 분석.
 * Store QR CRUD: /api/v1/kpa/pharmacy/qr
 * Public Landing: /api/v1/kpa/qr/public/:slug
 * Analytics: /api/v1/kpa/pharmacy/qr/:id/analytics
 */

import { STORE_QR_EXPORT_PRESETS } from '@o4o/store-ui-core';
import { apiClient } from './client';
import { getAccessToken } from '../contexts/AuthContext';

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
   *   canonical 대상 축(PRODUCT|CONTENT|SCREEN_SET|EXTERNAL_LINK) — 서버가 landingType 에서 파생.
   *   `type` 컬럼은 DEAD residue 라 이 계약에서 제거했다(읽지도 보내지도 않는다).
   */
  targetKind?: string | null;
  /** 내용의 원천(STORE_DIRECT · EXECUTION_ASSET · TABLET_SCREEN_SET …). null = 판정 보류(HOLD). */
  contentSource?: string | null;
  slug: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  scanCount?: number;
  // WO-O4O-KPA-QR-AI-DESCRIPTION-SINGLE-CORNER-V1: 연결된 direct 콘텐츠가 AI 설명이면 'single'|'corner'
  aiDescriptionMode?: string | null;
  // WO-O4O-KPA-STORE-QR-SCREENSET-STATE-ALIGNMENT-V1 §1: 코너 QR(screen_set) 상태(additive).
  //   보관된 화면 세트의 코너 QR 은 목록에 '보관' 으로 남고(주소 유지) 출력만 차단된다.
  /** 코너 QR 이 가리키는 화면 세트 id. 그 외 QR 은 null. */
  screenSetId?: string | null;
  /** 'active' | 'archived' | null(세트 미존재·비코너 QR) */
  screenSetStatus?: 'active' | 'archived' | null;
  /** 공개 /qr/:slug 가 실제로 열리는가 (홈 활성 QR KPI 와 동일 판정). */
  landable?: boolean;
  // QR 설정 모달 프리필용 — 상담 CTA 현재값
  consultationCtaEnabled?: boolean | null;
  consultationCtaLabel?: string | null;
}

export interface QrLandingData {
  id: string;
  title: string;
  description: string | null;
  landingType: string;
  landingTargetId: string | null;
  slug: string;
  organizationId: string;
  imageUrl: string | null;
  libraryItemTitle: string | null;
  storeSlug: string | null;
  // WO-O4O-KPA-QR-CODE-VIDEO-CONTENT-V1: landingType='video' 일 때 store_videos 사본의 외부 URL.
  videoUrl?: string | null;
  // WO-O4O-KPA-QR-PAGE-LANDING-RENDER-V1: landingType='page' 일 때 콘텐츠 본문 inline 데이터.
  //   content_hub(kpa_contents) 만 해석 — 그 외 page ref 는 null(기존 redirect 폴백).
  pageContent?: QrPageContent | null;
  // WO-O4O-KPA-QR-PAGE-CONSULTATION-CTA-V1: page 콘텐츠 하단 상담 요청 버튼 노출 설정.
  consultationCtaEnabled?: boolean;
  consultationCtaLabel?: string | null;
  // WO-O4O-KPA-TABLET-QR-LANDING-CONTRACT-V1: landingType='screen_set' 일 때 태블릿과 동일한 sections.
  //   모바일 뷰어(PublicScreenSetViewer)는 이 sections 를 세로형으로 렌더하되 idle_media(대기영상)는 제외한다.
  screenSet?: QrScreenSet | null;
}

// WO-O4O-KPA-TABLET-QR-LANDING-CONTRACT-V1: screen_set landing sections(공용 resolver 산출).
// WO-O4O-STORE-QR-CANONICAL-ADOPTED-IMPLEMENTATION-GAP-AUDIT-AND-PH-SCREENSET-FINAL-CLOSURE-V1:
//   공통 뷰어 승격에 따라 정의를 @o4o/tablet-kiosk-core 로 옮기고 여기서는 재수출만 한다
//   (KPA · PharmacyHub 가 같은 타입을 소비 — 서비스별 재선언 금지).
import type { QrScreenSet, QrScreenSetSection } from '@o4o/tablet-kiosk-core';
export type { QrScreenSet, QrScreenSetSection };

export type QrPageContent =
  | { available: false; reason: 'unpublished' }
  | {
      available: true;
      title: string;
      summary: string | null;
      body: string | null;
      blocks: unknown[];
      // WO-O4O-KPA-QR-AI-DESCRIPTION-SINGLE-CORNER-V1: 코너 모드 상품별 설명(저장본만, 추가 AI 호출 없음)
      items?: QrPublicItem[];
      // content_hub=운영자 콘텐츠 / store_asset=매장 제작자료 / direct_content=매장 직접 작성
      source: 'content_hub' | 'store_asset' | 'direct_content';
    };

export interface QrPublicItem {
  key: string;
  name: string;
  descriptionHtml: string;
  relatedKeys: string[];
}

export interface StoreQrPaginatedResponse {
  items: StoreQrCode[];
  page: number;
  limit: number;
  total: number;
}

// ─── Public ─────────────────────────────────────────

export async function getQrLandingData(
  slug: string,
): Promise<{ success: boolean; data: QrLandingData }> {
  return apiClient.get(`/qr/public/${slug}`);
}

// ─── CRUD ───────────────────────────────────────────

export async function getStoreQrCodes(opts?: {
  page?: number;
  limit?: number;
  /** 내린(비활성) QR 도 함께 받는다 — 다시 올리려면 목록에 남아 있어야 한다. */
  includeInactive?: boolean;
}): Promise<{ success: boolean; data: StoreQrPaginatedResponse }> {
  const params = new URLSearchParams();
  if (opts?.page) params.set('page', String(opts.page));
  if (opts?.limit) params.set('limit', String(opts.limit));
  if (opts?.includeInactive) params.set('includeInactive', 'true');
  const qs = params.toString();
  return apiClient.get(`/pharmacy/qr${qs ? `?${qs}` : ''}`);
}

export async function createStoreQrCode(data: {
  title: string;
  description?: string;
  libraryItemId?: string;
  landingType: string;
  landingTargetId?: string;
  slug: string;
  // WO-O4O-KPA-QR-PAGE-CONSULTATION-CTA-V1: page 콘텐츠 상담 CTA 설정
  consultationCtaEnabled?: boolean;
  consultationCtaLabel?: string;
}): Promise<{ success: boolean; data: StoreQrCode }> {
  return apiClient.post('/pharmacy/qr', data);
}

export async function updateStoreQrCode(
  id: string,
  data: Partial<{
    title: string;
    description: string;
    libraryItemId: string;
    landingType: string;
    landingTargetId: string;
    slug: string;
    consultationCtaEnabled: boolean;
    consultationCtaLabel: string;
  }>,
): Promise<{ success: boolean; data: StoreQrCode }> {
  return apiClient.put(`/pharmacy/qr/${id}`, data);
}

export async function deleteStoreQrCode(
  id: string,
): Promise<{ success: boolean; message: string }> {
  return apiClient.delete(`/pharmacy/qr/${id}`);
}

/**
 * 내린 QR 다시 올리기 (WO-O4O-STORE-QR-CANONICAL-TARGET-…-COMMONIZATION-V1 §17).
 * slug 와 연결 대상은 그대로다 — 이미 인쇄된 QR 이 같은 곳을 다시 연다.
 */
export async function reactivateStoreQrCode(
  id: string,
): Promise<{ success: boolean; data: { id: string; reactivated: true } }> {
  return apiClient.post(`/pharmacy/qr/${id}/reactivate`, {});
}

// ─── Analytics (WO-O4O-QR-SCAN-ANALYTICS-V1) ────────

export interface QrAnalyticsData {
  totalScans: number;
  todayScans: number;
  weeklyScans: number;
  deviceStats: { mobile: number; tablet: number; desktop: number };
}

export async function getQrAnalytics(
  qrId: string,
): Promise<{ success: boolean; data: QrAnalyticsData }> {
  return apiClient.get(`/pharmacy/qr/${qrId}/analytics`);
}

// ─── Export / Print (WO-O4O-KPA-STORE-QR-PRINT-EXPORT-FOUNDATION-V1) ──
//   StoreQRPage 후속 연결용 foundation. backend GET /pharmacy/qr/:id/export 를
//   Bearer 인증 fetch → blob 다운로드한다(apiClient 는 JSON 전용이라 별도 처리).

export type QrExportFormat = 'png' | 'svg' | 'pdf';
export type QrExportPreset = 'small' | 'medium' | 'large' | 'a4' | 'a4_4up';

/** UI 표시용 preset 카탈로그 (후속 StoreQRPage 메뉴 구성에 사용) */
/**
 * 출력 규격 5종은 @o4o/store-ui-core 가 정본이다 (KPA/PH 동일 목록).
 * 기존 소비처를 깨지 않도록 이름만 여기서 재수출한다.
 */
export const QR_EXPORT_PRESETS: ReadonlyArray<{
  preset: QrExportPreset;
  format: QrExportFormat;
  label: string;
  hint: string;
}> = STORE_QR_EXPORT_PRESETS;

// client.ts 와 동일한 base URL 규약 (private 이라 재구성)
const KPA_API_BASE = import.meta.env.VITE_API_BASE_URL
  ? `${import.meta.env.VITE_API_BASE_URL}/api/v1/kpa`
  : '/api/v1/kpa';

function parseFilename(disposition: string | null, fallback: string): string {
  if (!disposition) return fallback;
  // WO-O4O-KPA-QR-EXPORT-FILENAME-BY-TITLE-V1:
  //   RFC 5987 `filename*=UTF-8''<percent-encoded>` 우선(한글 제목 보존), 없으면 ASCII `filename=` 폴백.
  const star = /filename\*=UTF-8''([^;]+)/i.exec(disposition);
  if (star?.[1]) {
    try { return decodeURIComponent(star[1].trim()); } catch { /* fallthrough */ }
  }
  const m = /filename="?([^";]+)"?/.exec(disposition);
  return m?.[1]?.trim() || fallback;
}

/**
 * QR export 파일을 인증 fetch 후 Blob 으로 반환.
 * 호출 측이 직접 다운로드 처리하거나 미리보기에 사용.
 */
export async function fetchQrExportBlob(
  id: string,
  format: QrExportFormat,
  preset?: QrExportPreset,
): Promise<{ blob: Blob; filename: string }> {
  const token = getAccessToken();
  const params = new URLSearchParams({ format });
  if (preset) params.set('preset', preset);
  const res = await fetch(`${KPA_API_BASE}/pharmacy/qr/${id}/export?${params}`, {
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error?.message || `QR export 실패 (${res.status})`);
  }
  const blob = await res.blob();
  const ext = format === 'pdf' ? 'pdf' : format;
  const filename = parseFilename(res.headers.get('Content-Disposition'), `qr-${id}.${ext}`);
  return { blob, filename };
}

/**
 * QR export 파일을 브라우저 다운로드로 트리거 (StoreQRPage 버튼이 호출).
 */
export async function downloadQrExport(
  id: string,
  format: QrExportFormat,
  preset?: QrExportPreset,
): Promise<void> {
  const { blob, filename } = await fetchQrExportBlob(id, format, preset);
  const url = URL.createObjectURL(blob);
  try {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  } finally {
    URL.revokeObjectURL(url);
  }
}

// ── QR 사용처(Placement) — WO-O4O-STORE-QR-PLACEMENT-AND-ANALYTICS-IMPLEMENTATION-V1 §7 ──
//   백엔드 계약은 PharmacyHub 와 **동일**하다. 경로 prefix 만 서비스가 정한다(adapter 축).

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

export async function listQrPlacements(
  qrId: string,
): Promise<{ success: boolean; data: { items: StoreQrPlacementDto[]; activeCount: number } }> {
  return apiClient.get(`/pharmacy/qr/${qrId}/placements`);
}

export async function startQrPlacement(
  qrId: string,
  body: { placement: string; label?: string; cornerRef?: string; endOthers?: boolean },
): Promise<{ success: boolean; data: { placement: StoreQrPlacementDto; primaryPlacement: string | null } }> {
  return apiClient.post(`/pharmacy/qr/${qrId}/placements`, body);
}

export async function endQrPlacement(
  qrId: string,
  placementId: string,
): Promise<{ success: boolean; data: { placement: StoreQrPlacementDto; primaryPlacement: string | null } }> {
  return apiClient.post(`/pharmacy/qr/${qrId}/placements/${placementId}/end`, {});
}

export interface QrPlacementScanRow { placement: string; label: string | null; scans: number }

export async function getQrPlacementAnalytics(
  qrId: string,
): Promise<{ success: boolean; data: { byPlacement: QrPlacementScanRow[] } }> {
  return apiClient.get(`/pharmacy/qr/${qrId}/placement-analytics`);
}

/** 같은 콘텐츠로 QR 추가 — target 축 복제 + 새 slug. 위치별 분석의 전제 동선(§8). */
export async function cloneQrCode(
  qrId: string,
  body?: { title?: string; placement?: string; label?: string },
): Promise<{ success: boolean; data: { qr: StoreQrCode; placement: StoreQrPlacementDto | null } }> {
  return apiClient.post(`/pharmacy/qr/${qrId}/clone`, body ?? {});
}
