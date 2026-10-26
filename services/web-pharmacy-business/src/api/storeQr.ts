import type {
  QrExportFormat,
  QrExportPreset,
  QrPageContent,
} from "@o4o/store-ui-core/api/storeQr";
import {
  createStoreQrClient,
  parseFilename,
} from "@o4o/store-ui-core/api/storeQr";
export { QR_EXPORT_PRESETS } from "@o4o/store-ui-core/api/storeQr";
export type {
  QrAnalyticsData,
  QrExportFormat,
  QrExportPreset,
  QrPageContent,
  QrPlacementScanRow,
  QrPublicItem,
  StoreQrCode,
  StoreQrPaginatedResponse,
  StoreQrPlacementAnalyticsDto,
  StoreQrPlacementDto,
} from "@o4o/store-ui-core/api/storeQr";
export type { QrScreenSet, QrScreenSetSection };

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

import { getAccessToken } from "../contexts/AuthContext";
import { apiClient } from "./client";

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
  // WO-NETURE-PHARMACY-STORE-COMMERCE-REFACTOR-V1: landingType='product' 일 때 공용 랜딩이 내려주는 상품 요약 · 매장 설명서
  //   (옛 PH 도메인 QR 화면과 같은 계약 — 매장 상품 공개 페이지 노출 설정과 무관하게 QR 화면에서 보인다).
  productDetails?: {
    name?: string | null;
    brandName?: string | null;
    description?: string | null;
    descriptionSummary?: string | null;
    descriptionHtml?: string | null;
  } | null;
}

// WO-O4O-KPA-TABLET-QR-LANDING-CONTRACT-V1: screen_set landing sections(공용 resolver 산출).
// WO-O4O-STORE-QR-CANONICAL-ADOPTED-IMPLEMENTATION-GAP-AUDIT-AND-PH-SCREENSET-FINAL-CLOSURE-V1:
//   공통 뷰어 승격에 따라 정의를 @o4o/tablet-kiosk-core 로 옮기고 여기서는 재수출만 한다
//   (KPA · PharmacyHub 가 같은 타입을 소비 — 서비스별 재선언 금지).
import type { QrScreenSet, QrScreenSetSection } from "@o4o/tablet-kiosk-core";

// ─── Public ─────────────────────────────────────────

export async function getQrLandingData(
  slug: string,
): Promise<{ success: boolean; data: QrLandingData }> {
  return apiClient.get(`/qr/public/${slug}`);
}

// client.ts 와 동일한 base URL 규약 (private 이라 재구성)
const KPA_API_BASE = import.meta.env.VITE_API_BASE_URL
  ? `${import.meta.env.VITE_API_BASE_URL}/api/v1/kpa`
  : "/api/v1/kpa";

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
  if (preset) params.set("preset", preset);
  const res = await fetch(
    `${KPA_API_BASE}/pharmacy/qr/${id}/export?${params}`,
    {
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    },
  );
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error?.message || `QR export 실패 (${res.status})`);
  }
  const blob = await res.blob();
  const ext = format === "pdf" ? "pdf" : format;
  const filename = parseFilename(
    res.headers.get("Content-Disposition"),
    `qr-${id}.${ext}`,
  );
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
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  } finally {
    URL.revokeObjectURL(url);
  }
}

export const {
  getStoreQrCodes,
  createStoreQrCode,
  updateStoreQrCode,
  deleteStoreQrCode,
  reactivateStoreQrCode,
  getQrAnalytics,
  listQrPlacements,
  startQrPlacement,
  endQrPlacement,
  getQrPlacementAnalytics,
  getStorePlacementAnalytics,
  cloneQrCode,
} = createStoreQrClient({ apiClient });
