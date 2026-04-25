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
  sourceType: 'youtube' | 'vimeo';
  sourceUrl: string;
  tags?: string[];
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

/* ─── API Functions ─────────────────────────── */

export async function fetchSignageMedia(
  organizationId: string,
): Promise<SignageMediaItem[]> {
  const res = await fetch(`${BASE}?limit=200`, {

    headers: headers(organizationId),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  const data = json.data ?? json;
  return Array.isArray(data)
    ? data
    : data.items ?? [];
}

export async function createSignageMedia(
  organizationId: string,
  payload: CreateSignageMediaPayload,
): Promise<SignageMediaItem> {
  const res = await fetch(BASE, {
    method: 'POST',

    headers: headers(organizationId),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `HTTP ${res.status}`);
  }
  const json = await res.json();
  return json.data ?? json;
}

export async function deleteSignageMedia(
  organizationId: string,
  id: string,
): Promise<void> {
  const res = await fetch(`${BASE}/${id}`, {
    method: 'DELETE',

    headers: headers(organizationId),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `HTTP ${res.status}`);
  }
}
