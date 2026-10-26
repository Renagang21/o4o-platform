import type { QrLandingData as BaseQrLandingData } from "@o4o/store-ui-core/api/storeQr";
import {
  createQrExportClient,
  createStoreQrClient,
} from "@o4o/store-ui-core/api/storeQr";
export interface QrLandingData extends BaseQrLandingData {
  productDetails?: {
    name?: string | null;
    brandName?: string | null;
    description?: string | null;
    descriptionSummary?: string | null;
    descriptionHtml?: string | null;
  } | null;
}
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

// WO-O4O-KPA-TABLET-QR-LANDING-CONTRACT-V1: screen_set landing sections(공용 resolver 산출).
// WO-O4O-STORE-QR-CANONICAL-ADOPTED-IMPLEMENTATION-GAP-AUDIT-AND-PH-SCREENSET-FINAL-CLOSURE-V1:
//   공통 뷰어 승격에 따라 정의를 @o4o/tablet-kiosk-core 로 옮기고 여기서는 재수출만 한다
//   (KPA · PharmacyHub 가 같은 타입을 소비 — 서비스별 재선언 금지).
import type { QrScreenSet, QrScreenSetSection } from "@o4o/tablet-kiosk-core";

// client.ts 와 동일한 base URL 규약 (private 이라 재구성)
const KPA_API_BASE = import.meta.env.VITE_API_BASE_URL
  ? `${import.meta.env.VITE_API_BASE_URL}/api/v1/kpa`
  : "/api/v1/kpa";

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
  getQrLandingData,
} = createStoreQrClient<QrLandingData>({ apiClient });
export const { fetchQrExportBlob, downloadQrExport } = createQrExportClient({
  getApiBase: () => KPA_API_BASE,
  getAccessToken,
});
