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
  | { available: false; reason: 'private' | 'not_found' }
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
