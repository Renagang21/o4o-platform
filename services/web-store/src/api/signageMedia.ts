/**
 * Signage Media API Client
 *
 * WO-KPA-STORE-SIGNAGE-SCREENS-UI-CLEANUP-V1
 *
 * Backend: /api/signage/kpa-society/media (requireSignageStore)
 * Auth: Bearer token (localStorage) + X-Organization-Id header
 *
 * Store 소유 signage_media CRUD (URL 기반 동영상 등록)
 */

import { storeScopedFetch } from './storeScopedFetch';
import { getAccessToken } from '../contexts/AuthContext';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';
const BASE = `${API_BASE}/api/signage/kpa-society/media`;

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
  sourceType: 'youtube' | 'vimeo' | 'url';
  mediaLibraryAssetId?: string;
  sourceUrl: string;
  description?: string;
  tags?: string[];
  status?: 'draft' | 'active';
}

export interface UpdateSignageMediaPayload {
  name?: string;
  description?: string;
  /** WO-O4O-STORE-SIGNAGE-SOURCEURL-EDIT-ENABLE-V1: store owner may change video URL */
  sourceUrl?: string;
  thumbnailUrl?: string;
  tags?: string[];
  status?: 'draft' | 'active';
}

/* ─── Helpers ───────────────────────────────── */

function headers(organizationId: string): Record<string, string> {
  const token = getAccessToken();
  return {
    'Content-Type': 'application/json',
    'X-Organization-Id': organizationId,
    ...(token && { 'Authorization': `Bearer ${token}` }),
  };
}

function mediaResult(json: { success?: boolean; data?: SignageMediaItem } & Partial<SignageMediaItem>): SignageMediaItem {
  const value = json.data ?? json;
  if (json.success === false || typeof value.id !== 'string' || !value.id || typeof value.name !== 'string')
    throw new Error('동영상 저장 결과를 확인하지 못했습니다. 목록을 확인해 주세요.');
  return value as SignageMediaItem;
}

/* ─── API Functions ─────────────────────────── */

export async function fetchSignageMedia(
  organizationId: string,
): Promise<SignageMediaItem[]> {
  const res = await storeScopedFetch(`${BASE}?limit=200`, {

    headers: headers(organizationId),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  if (json.success === false) throw new Error('동영상 목록을 불러오지 못했습니다.');
  const data = json.data ?? json;
  const items = Array.isArray(data) ? data : data.items;
  if (!Array.isArray(items)) throw new Error('동영상 목록을 확인하지 못했습니다.');
  return items;
}

export async function createSignageMedia(
  organizationId: string,
  payload: CreateSignageMediaPayload,
): Promise<SignageMediaItem> {
  const res = await storeScopedFetch(BASE, {
    method: 'POST',

    headers: headers(organizationId),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `HTTP ${res.status}`);
  }
  const json = await res.json();
  return mediaResult(json);
}

export async function updateSignageMedia(
  organizationId: string,
  id: string,
  payload: UpdateSignageMediaPayload,
): Promise<SignageMediaItem> {
  const res = await storeScopedFetch(`${BASE}/${id}`, {
    method: 'PATCH',
    headers: headers(organizationId),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `HTTP ${res.status}`);
  }
  const json = await res.json();
  return mediaResult(json);
}

export async function deleteSignageMedia(
  organizationId: string,
  id: string,
): Promise<void> {
  const res = await storeScopedFetch(`${BASE}/${id}`, {
    method: 'DELETE',

    headers: headers(organizationId),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `HTTP ${res.status}`);
  }
}
