/**
 * Signage Schedule API Client — GlycoPharm
 *
 * WO-O4O-GLYCOPHARM-SIGNAGE-SCHEDULE-V1
 * KPA canonical signageSchedule.ts 이식
 *
 * Backend: /api/signage/glycopharm/schedules (requireSignageStore)
 * Auth: Bearer token (api 자동 처리) + X-Organization-Id header
 * organizationId: user.pharmacyId (GlycoPharm pharmacy = organization)
 */

import { api, API_BASE_URL } from '@/lib/apiClient';

const BASE = `${API_BASE_URL}/api/signage/glycopharm`;

/* ─── Types ─────────────────────────────────── */

export interface SignageScheduleItem {
  id: string;
  name: string;
  playlistId: string;
  channelId: string | null;
  daysOfWeek: number[];
  startTime: string; // HH:MM:SS
  endTime: string;   // HH:MM:SS
  validFrom: string | null;
  validUntil: string | null;
  priority: number;
  isActive: boolean;
  metadata: Record<string, unknown> | null;
  playlist?: { id: string; name: string };
  createdAt: string;
  updatedAt: string;
}

export interface CreateSchedulePayload {
  name: string;
  playlistId: string;
  channelId?: string | null;
  daysOfWeek: number[];
  startTime: string; // HH:MM
  endTime: string;   // HH:MM
  validFrom?: string | null;
  validUntil?: string | null;
  priority?: number;
  isActive?: boolean;
}

export interface UpdateSchedulePayload {
  name?: string;
  playlistId?: string;
  channelId?: string | null;
  daysOfWeek?: number[];
  startTime?: string;
  endTime?: string;
  validFrom?: string | null;
  validUntil?: string | null;
  priority?: number;
  isActive?: boolean;
}

export interface SignagePlaylistOption {
  id: string;
  name: string;
}

/* ─── Helpers ───────────────────────────────── */

function orgHeaders(organizationId: string) {
  return { 'X-Organization-Id': organizationId };
}

/** UI HH:MM → API HH:MM:00 */
function toApiTime(t: string): string {
  return t.length === 5 ? `${t}:00` : t;
}

/* ─── API Functions ─────────────────────────── */

export async function fetchSchedules(
  organizationId: string,
  params?: { page?: number; limit?: number; isActive?: boolean },
): Promise<{ items: SignageScheduleItem[]; total: number }> {
  const sp = new URLSearchParams();
  if (params?.page) sp.append('page', String(params.page));
  if (params?.limit) sp.append('limit', String(params.limit));
  if (params?.isActive !== undefined) sp.append('isActive', String(params.isActive));
  const q = sp.toString();
  const url = q ? `${BASE}/schedules?${q}` : `${BASE}/schedules`;

  const res = await api.get(url, { headers: orgHeaders(organizationId) });
  const json = res.data as { data?: { items?: SignageScheduleItem[]; total?: number }; items?: SignageScheduleItem[]; total?: number };
  return json.data ?? { items: json.items ?? [], total: json.total ?? 0 };
}

export async function createSchedule(
  organizationId: string,
  payload: CreateSchedulePayload,
): Promise<SignageScheduleItem> {
  const body = {
    ...payload,
    startTime: toApiTime(payload.startTime),
    endTime: toApiTime(payload.endTime),
  };
  const res = await api.post(`${BASE}/schedules`, body, { headers: orgHeaders(organizationId) });
  const json = res.data as { data?: SignageScheduleItem } | SignageScheduleItem;
  return (json as { data?: SignageScheduleItem }).data ?? (json as SignageScheduleItem);
}

export async function updateSchedule(
  organizationId: string,
  id: string,
  payload: UpdateSchedulePayload,
): Promise<SignageScheduleItem> {
  const body = { ...payload };
  if (body.startTime) body.startTime = toApiTime(body.startTime);
  if (body.endTime) body.endTime = toApiTime(body.endTime);
  const res = await api.patch(`${BASE}/schedules/${id}`, body, { headers: orgHeaders(organizationId) });
  const json = res.data as { data?: SignageScheduleItem } | SignageScheduleItem;
  return (json as { data?: SignageScheduleItem }).data ?? (json as SignageScheduleItem);
}

export async function deleteSchedule(
  organizationId: string,
  id: string,
): Promise<void> {
  await api.delete(`${BASE}/schedules/${id}`, { headers: orgHeaders(organizationId) });
}

export async function fetchSignagePlaylists(
  organizationId: string,
): Promise<SignagePlaylistOption[]> {
  const res = await api.get(`${BASE}/playlists?limit=100`, { headers: orgHeaders(organizationId) });
  const json = res.data as { data?: { items?: SignagePlaylistOption[] } | SignagePlaylistOption[]; items?: SignagePlaylistOption[] };
  const items = (json.data as { items?: SignagePlaylistOption[] })?.items
    ?? (Array.isArray(json.data) ? json.data : null)
    ?? json.items
    ?? [];
  return Array.isArray(items)
    ? items.map((p: { id: string; name: string }) => ({ id: p.id, name: p.name }))
    : [];
}
