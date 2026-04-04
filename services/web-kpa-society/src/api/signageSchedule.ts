/**
 * Signage Schedule API Client
 *
 * WO-KPA-SOCIETY-DIGITAL-SIGNAGE-SCHEDULE-UI-IMPLEMENTATION-V1
 *
 * Backend: /api/signage/kpa-society/schedules (requireSignageStore)
 * Auth: cookie + X-Organization-Id header
 */

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';
const BASE = `${API_BASE}/api/signage/kpa-society`;

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

function headers(organizationId: string): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'X-Organization-Id': organizationId,
  };
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

  const res = await fetch(url, { credentials: 'include', headers: headers(organizationId) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  return json.data ?? { items: json.items ?? json, total: json.total ?? 0 };
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
  const res = await fetch(`${BASE}/schedules`, {
    method: 'POST',
    credentials: 'include',
    headers: headers(organizationId),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `HTTP ${res.status}`);
  }
  const json = await res.json();
  return json.data ?? json;
}

export async function updateSchedule(
  organizationId: string,
  id: string,
  payload: UpdateSchedulePayload,
): Promise<SignageScheduleItem> {
  const body = { ...payload };
  if (body.startTime) body.startTime = toApiTime(body.startTime);
  if (body.endTime) body.endTime = toApiTime(body.endTime);
  const res = await fetch(`${BASE}/schedules/${id}`, {
    method: 'PATCH',
    credentials: 'include',
    headers: headers(organizationId),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `HTTP ${res.status}`);
  }
  const json = await res.json();
  return json.data ?? json;
}

export async function deleteSchedule(
  organizationId: string,
  id: string,
): Promise<void> {
  const res = await fetch(`${BASE}/schedules/${id}`, {
    method: 'DELETE',
    credentials: 'include',
    headers: headers(organizationId),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}

export async function fetchSignagePlaylists(
  organizationId: string,
): Promise<SignagePlaylistOption[]> {
  const res = await fetch(`${BASE}/playlists?limit=100`, {
    credentials: 'include',
    headers: headers(organizationId),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  const items = json.data?.items ?? json.items ?? json.data ?? json;
  return Array.isArray(items)
    ? items.map((p: { id: string; name: string }) => ({ id: p.id, name: p.name }))
    : [];
}
