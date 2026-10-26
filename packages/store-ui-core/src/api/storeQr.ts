import type { QrScreenSet } from "@o4o/tablet-kiosk-core";
/** Shared store client implementation; service transports remain in the app adapters. */
import { STORE_QR_EXPORT_PRESETS } from "../components/qr/storeQrOperationModel";
import type { JsonApiClient } from "./transport";

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
  screenSetStatus?: "active" | "archived" | null;
  /** 공개 /qr/:slug 가 실제로 열리는가 (홈 활성 QR KPI 와 동일 판정). */
  landable?: boolean;
  // QR 설정 모달 프리필용 — 상담 CTA 현재값
  consultationCtaEnabled?: boolean | null;
  consultationCtaLabel?: string | null;
  // WO-O4O-STORE-EXECUTION-HOME-TABLET-QR-V1 (additive · 백엔드 무변경):
  //   `store-qr.service.ts` 는 이미 두 값을 내려주고 있었는데 프론트 타입만 비어 있었다.
  //   배치(placement)는 대상(targetKind)과 **다른 축**이다 — 어디에 붙어 있는지를 말한다.
  /** 활성 배치의 대표값. null = 배치 0곳, 'MULTIPLE' = 2곳 이상(위치를 단정하지 않는다). */
  primaryPlacement?: string | null;
  /** 활성 배치 수. */
  activePlacementCount?: number;
}

export type QrPageContent =
  | { available: false; reason: "unpublished" }
  | {
      available: true;
      title: string;
      summary: string | null;
      body: string | null;
      blocks: unknown[];
      // WO-O4O-KPA-QR-AI-DESCRIPTION-SINGLE-CORNER-V1: 코너 모드 상품별 설명(저장본만, 추가 AI 호출 없음)
      items?: QrPublicItem[];
      // content_hub=운영자 콘텐츠 / store_asset=매장 제작자료 / direct_content=매장 직접 작성
      source: "content_hub" | "store_asset" | "direct_content";
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

export interface QrAnalyticsData {
  totalScans: number;
  todayScans: number;
  weeklyScans: number;
  deviceStats: { mobile: number; tablet: number; desktop: number };
}

export type QrExportFormat = "png" | "svg" | "pdf";

export type QrExportPreset = "small" | "medium" | "large" | "a4" | "a4_4up";

export interface StoreQrPlacementDto {
  id: string;
  qrCodeId: string;
  placement: string;
  label: string | null;
  cornerRef: string | null;
  status: "active" | "ended";
  startedAt: string;
  endedAt: string | null;
}

export interface QrPlacementScanRow {
  placement: string;
  label: string | null;
  scans: number;
}

export interface StoreQrPlacementAnalyticsDto {
  byPlacement: QrPlacementScanRow[];
  byContentSource: Array<{ contentSource: string | null; scans: number }>;
  byTargetKind: Array<{ landingType: string | null; scans: number }>;
  totalScans: number;
}

export const QR_EXPORT_PRESETS: ReadonlyArray<{
  preset: QrExportPreset;
  format: QrExportFormat;
  label: string;
  hint: string;
}> = STORE_QR_EXPORT_PRESETS;

export function parseFilename(
  disposition: string | null,
  fallback: string,
): string {
  if (!disposition) return fallback;
  // WO-O4O-KPA-QR-EXPORT-FILENAME-BY-TITLE-V1:
  //   RFC 5987 `filename*=UTF-8''<percent-encoded>` 우선(한글 제목 보존), 없으면 ASCII `filename=` 폴백.
  const star = /filename\*=UTF-8''([^;]+)/i.exec(disposition);
  if (star?.[1]) {
    try {
      return decodeURIComponent(star[1].trim());
    } catch {
      /* fallthrough */
    }
  }
  const m = /filename="?([^";]+)"?/.exec(disposition);
  return m?.[1]?.trim() || fallback;
}

export function createStoreQrClient<
  Landing extends QrLandingData = QrLandingData,
>({ apiClient }: { apiClient: JsonApiClient }) {
  async function getStoreQrCodes(opts?: {
    page?: number;
    limit?: number;
    /** 내린(비활성) QR 도 함께 받는다 — 다시 올리려면 목록에 남아 있어야 한다. */
    includeInactive?: boolean;
  }): Promise<{ success: boolean; data: StoreQrPaginatedResponse }> {
    const params = new URLSearchParams();
    if (opts?.page) params.set("page", String(opts.page));
    if (opts?.limit) params.set("limit", String(opts.limit));
    if (opts?.includeInactive) params.set("includeInactive", "true");
    const qs = params.toString();
    return apiClient.get(`/pharmacy/qr${qs ? `?${qs}` : ""}`);
  }

  async function createStoreQrCode(data: {
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
    return apiClient.post("/pharmacy/qr", data);
  }

  async function updateStoreQrCode(
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

  async function deleteStoreQrCode(
    id: string,
  ): Promise<{ success: boolean; message: string }> {
    return apiClient.delete(`/pharmacy/qr/${id}`);
  }

  async function reactivateStoreQrCode(
    id: string,
  ): Promise<{ success: boolean; data: { id: string; reactivated: true } }> {
    return apiClient.post(`/pharmacy/qr/${id}/reactivate`, {});
  }

  async function getQrAnalytics(
    qrId: string,
  ): Promise<{ success: boolean; data: QrAnalyticsData }> {
    return apiClient.get(`/pharmacy/qr/${qrId}/analytics`);
  }

  async function listQrPlacements(qrId: string): Promise<{
    success: boolean;
    data: { items: StoreQrPlacementDto[]; activeCount: number };
  }> {
    return apiClient.get(`/pharmacy/qr/${qrId}/placements`);
  }

  async function startQrPlacement(
    qrId: string,
    body: {
      placement: string;
      label?: string;
      cornerRef?: string;
      endOthers?: boolean;
    },
  ): Promise<{
    success: boolean;
    data: { placement: StoreQrPlacementDto; primaryPlacement: string | null };
  }> {
    return apiClient.post(`/pharmacy/qr/${qrId}/placements`, body);
  }

  async function endQrPlacement(
    qrId: string,
    placementId: string,
  ): Promise<{
    success: boolean;
    data: { placement: StoreQrPlacementDto; primaryPlacement: string | null };
  }> {
    return apiClient.post(
      `/pharmacy/qr/${qrId}/placements/${placementId}/end`,
      {},
    );
  }

  async function getQrPlacementAnalytics(qrId: string): Promise<{
    success: boolean;
    data: { byPlacement: QrPlacementScanRow[] };
  }> {
    return apiClient.get(`/pharmacy/qr/${qrId}/placement-analytics`);
  }

  async function getStorePlacementAnalytics(
    days?: number | null,
  ): Promise<{ success: boolean; data: StoreQrPlacementAnalyticsDto }> {
    const qs = days ? `?days=${days}` : "";
    return apiClient.get(`/pharmacy/qr-analytics/placements${qs}`);
  }

  async function cloneQrCode(
    qrId: string,
    body?: { title?: string; placement?: string; label?: string },
  ): Promise<{
    success: boolean;
    data: { qr: StoreQrCode; placement: StoreQrPlacementDto | null };
  }> {
    return apiClient.post(`/pharmacy/qr/${qrId}/clone`, body ?? {});
  }

  async function getQrLandingData(
    slug: string,
  ): Promise<{ success: boolean; data: Landing }> {
    return apiClient.get(`/qr/public/${slug}`);
  }
  return {
    getQrLandingData,
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
  };
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

export function createQrExportClient({
  getApiBase,
  getAccessToken,
}: {
  getApiBase: () => string;
  getAccessToken: () => string | null;
}) {
  async function fetchQrExportBlob(
    id: string,
    format: QrExportFormat,
    preset?: QrExportPreset,
  ): Promise<{ blob: Blob; filename: string }> {
    const token = getAccessToken();
    const params = new URLSearchParams({ format });
    if (preset) params.set("preset", preset);
    const res = await fetch(
      `${getApiBase()}/pharmacy/qr/${id}/export?${params}`,
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
  async function downloadQrExport(
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
  return { fetchQrExportBlob, downloadQrExport };
}
