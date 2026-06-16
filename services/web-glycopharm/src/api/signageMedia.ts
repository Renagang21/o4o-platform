/**
 * Signage Media API Client — GlycoPharm
 *
 * WO-O4O-GLYCOPHARM-STORE-SIGNAGE-MEDIA-REGISTRATION-FRONTEND-PARITY-V1
 * KPA canonical signageMedia.ts 이식 (frontend-only — 백엔드는 serviceKey 공통 라우트 재사용).
 *
 * Backend: /api/signage/glycopharm/media (requireSignageStore, serviceKey 공통)
 * Auth: Bearer token (api 자동 처리) + X-Organization-Id header
 * organizationId: store-hub overview 에서 해석 (GlycoPharm pharmacy = organization)
 */

import { api, API_BASE_URL } from '@/lib/apiClient';

const BASE = `${API_BASE_URL}/api/signage/glycopharm/media`;

/* ─── Types ─────────────────────────────────── */

export interface SignageMediaItem {
  id: string;
  name: string;
  description: string | null;
  mediaType: string;
  sourceType: string;
  sourceUrl: string;
  embedId: string | null;
  thumbnailUrl: string | null;
  status: string;
  source: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateSignageMediaPayload {
  name: string;
  mediaType: 'video';
  sourceType: 'youtube' | 'vimeo';
  sourceUrl: string;
  description?: string;
  tags?: string[];
  status?: 'draft' | 'active';
}

/* ─── Helpers ───────────────────────────────── */

function orgHeaders(organizationId: string) {
  return { 'X-Organization-Id': organizationId };
}

/* ─── API Functions ─────────────────────────── */

export async function fetchSignageMedia(organizationId: string): Promise<SignageMediaItem[]> {
  const res = await api.get(`${BASE}?limit=200`, { headers: orgHeaders(organizationId) });
  const json = res.data as { data?: SignageMediaItem[] | { items?: SignageMediaItem[] } } | SignageMediaItem[];
  const data = (json as { data?: unknown }).data ?? json;
  if (Array.isArray(data)) return data as SignageMediaItem[];
  return ((data as { items?: SignageMediaItem[] })?.items) ?? [];
}

export async function createSignageMedia(
  organizationId: string,
  payload: CreateSignageMediaPayload,
): Promise<SignageMediaItem> {
  const res = await api.post(BASE, payload, { headers: orgHeaders(organizationId) });
  const json = res.data as { data?: SignageMediaItem } | SignageMediaItem;
  return (json as { data?: SignageMediaItem }).data ?? (json as SignageMediaItem);
}

export async function deleteSignageMedia(organizationId: string, id: string): Promise<void> {
  await api.delete(`${BASE}/${id}`, { headers: orgHeaders(organizationId) });
}
