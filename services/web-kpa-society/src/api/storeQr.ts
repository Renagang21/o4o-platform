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

import { apiClient } from './client';
import { getAccessToken } from '../contexts/AuthContext';

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
  createdAt: string;
  updatedAt: string;
  scanCount?: number;
}

export interface QrLandingData {
  id: string;
  type: string;
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
}

export type QrPageContent =
  | { available: false; reason: 'unpublished' }
  | {
      available: true;
      title: string;
      summary: string | null;
      body: string | null;
      blocks: unknown[];
      source: 'content_hub';
    };

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
}): Promise<{ success: boolean; data: StoreQrPaginatedResponse }> {
  const params = new URLSearchParams();
  if (opts?.page) params.set('page', String(opts.page));
  if (opts?.limit) params.set('limit', String(opts.limit));
  const qs = params.toString();
  return apiClient.get(`/pharmacy/qr${qs ? `?${qs}` : ''}`);
}

export async function createStoreQrCode(data: {
  title: string;
  description?: string;
  type?: string;
  libraryItemId?: string;
  landingType: string;
  landingTargetId?: string;
  slug: string;
}): Promise<{ success: boolean; data: StoreQrCode }> {
  return apiClient.post('/pharmacy/qr', data);
}

export async function updateStoreQrCode(
  id: string,
  data: Partial<{
    title: string;
    description: string;
    type: string;
    libraryItemId: string;
    landingType: string;
    landingTargetId: string;
    slug: string;
  }>,
): Promise<{ success: boolean; data: StoreQrCode }> {
  return apiClient.put(`/pharmacy/qr/${id}`, data);
}

export async function deleteStoreQrCode(
  id: string,
): Promise<{ success: boolean; message: string }> {
  return apiClient.delete(`/pharmacy/qr/${id}`);
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
export const QR_EXPORT_PRESETS: ReadonlyArray<{
  preset: QrExportPreset;
  format: QrExportFormat;
  label: string;
  hint: string;
}> = [
  // WO-O4O-KPA-STORE-QR-EXPORT-FILE-GUIDE-V1: 선택 기준이 드러나도록 hint 개선
  { preset: 'medium', format: 'png', label: 'PNG (이미지)', hint: '간단 삽입·공유' },
  { preset: 'large', format: 'png', label: 'PNG 고해상도', hint: '문서·POP 편집' },
  { preset: 'medium', format: 'svg', label: 'SVG (벡터)', hint: '전문 출력소·크기 조절' },
  { preset: 'a4', format: 'pdf', label: 'A4 1장 PDF', hint: '약국에서 바로 출력' },
  { preset: 'a4_4up', format: 'pdf', label: 'A4 4분할 PDF', hint: '잘라서 여러 곳에 부착' },
];

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
