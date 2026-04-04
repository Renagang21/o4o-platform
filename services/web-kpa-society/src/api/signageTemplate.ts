/**
 * Signage Template API Client - KPA-Society
 *
 * WO-KPA-SOCIETY-DIGITAL-SIGNAGE-TEMPLATE-CRUD-UI-V1
 * Operator Template CRUD via existing backend endpoints.
 *
 * Auth: Bearer token (getAccessToken) — matches existing template pages.
 * Endpoints: /api/signage/kpa-society/templates/*
 */

import { getAccessToken } from '../contexts/AuthContext';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';
const BASE = `${API_BASE}/api/signage/kpa-society`;

// ── Types ──

export interface TemplateLayoutConfig {
  width: number;
  height: number;
  orientation: 'landscape' | 'portrait';
  backgroundColor?: string;
  backgroundImage?: string;
}

export interface SignageTemplateItem {
  id: string;
  serviceKey: string;
  organizationId: string | null;
  name: string;
  description: string | null;
  layoutConfig: TemplateLayoutConfig;
  category: string | null;
  tags: string[];
  thumbnailUrl: string | null;
  status: 'active' | 'inactive' | 'draft';
  isPublic: boolean;
  isSystem: boolean;
  createdByUserId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTemplatePayload {
  name: string;
  description?: string;
  layoutConfig: TemplateLayoutConfig;
  category?: string;
  tags?: string[];
  status?: 'active' | 'inactive' | 'draft';
  isPublic?: boolean;
  isSystem?: boolean;
  metadata?: Record<string, unknown>;
}

export interface UpdateTemplatePayload {
  name?: string;
  description?: string;
  layoutConfig?: Partial<TemplateLayoutConfig>;
  category?: string;
  tags?: string[];
  thumbnailUrl?: string;
  status?: 'active' | 'inactive' | 'draft';
  isPublic?: boolean;
}

export interface TemplateZoneItem {
  id: string;
  templateId: string;
  name: string;
  zoneKey: string | null;
  zoneType: string;
  position: { x: number; y: number; width: number; height: number; unit: string } | null;
  zIndex: number;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ── Helpers ──

function authHeaders(): Record<string, string> {
  const token = getAccessToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error || body?.message || `API error ${res.status}`);
  }
  return res.json();
}

// ── API Functions ──

export async function fetchTemplates(
  params?: { page?: number; limit?: number; status?: string; search?: string },
): Promise<{ items: SignageTemplateItem[]; total: number; meta: Record<string, unknown> }> {
  const sp = new URLSearchParams();
  if (params?.page) sp.append('page', params.page.toString());
  if (params?.limit) sp.append('limit', params.limit.toString());
  if (params?.status) sp.append('status', params.status);
  if (params?.search) sp.append('search', params.search);
  const query = sp.toString();
  const url = query ? `${BASE}/templates?${query}` : `${BASE}/templates`;

  const json = await handleResponse<{ data: SignageTemplateItem[]; meta: Record<string, unknown> }>(
    await fetch(url, { headers: authHeaders() }),
  );
  const items = json.data || [];
  return { items, total: items.length, meta: json.meta || {} };
}

export async function fetchTemplate(id: string): Promise<SignageTemplateItem> {
  const json = await handleResponse<{ data: SignageTemplateItem }>(
    await fetch(`${BASE}/templates/${id}`, { headers: authHeaders() }),
  );
  return json.data;
}

export async function createTemplate(payload: CreateTemplatePayload): Promise<SignageTemplateItem> {
  const json = await handleResponse<{ data: SignageTemplateItem }>(
    await fetch(`${BASE}/templates`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(payload),
    }),
  );
  return json.data;
}

export async function updateTemplate(id: string, payload: UpdateTemplatePayload): Promise<SignageTemplateItem> {
  const json = await handleResponse<{ data: SignageTemplateItem }>(
    await fetch(`${BASE}/templates/${id}`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify(payload),
    }),
  );
  return json.data;
}

export async function deleteTemplate(id: string): Promise<void> {
  const res = await fetch(`${BASE}/templates/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error || body?.message || `API error ${res.status}`);
  }
}

export async function fetchTemplateZones(templateId: string): Promise<TemplateZoneItem[]> {
  const json = await handleResponse<{ data: TemplateZoneItem[] }>(
    await fetch(`${BASE}/templates/${templateId}/zones`, { headers: authHeaders() }),
  );
  return json.data || [];
}
