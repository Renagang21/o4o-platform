/**
 * Signage AI Content Generation API Client — KPA-Society
 *
 * WO-KPA-SOCIETY-DIGITAL-SIGNAGE-AI-CONTENT-GENERATION-UI-V1
 * AI draft generation + HQ Media save via existing backend endpoints.
 *
 * Auth: Bearer token (getAccessToken) — matches signageTemplate.ts pattern.
 * Endpoints: /api/signage/kpa-society/ai/generate, /api/signage/kpa-society/hq/media
 */

import { getAccessToken } from '../contexts/AuthContext';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';
const BASE = `${API_BASE}/api/signage/kpa-society`;

// ── Types ──

export interface AiGenerateRequest {
  prompt: string;
  templateType: 'banner' | 'card' | 'poster' | 'slide';
  style?: 'modern' | 'classic' | 'minimal' | 'vibrant';
  width?: number;
  height?: number;
  metadata?: Record<string, unknown>;
}

export interface AiGenerateResponse {
  contentBlockId: string;
  generatedContent: string;
  thumbnailUrl: string | null;
  generationLog: {
    modelName: string;
    tokensUsed: number;
    generatedAt: string;
  };
}

export interface SaveAsHqMediaPayload {
  name: string;
  description?: string;
  mediaType: string;
  sourceType: string;
  sourceUrl: string;
  content?: string;
  tags?: string[];
  category?: string;
  metadata?: Record<string, unknown>;
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

export async function generateAiContent(payload: AiGenerateRequest): Promise<AiGenerateResponse> {
  const json = await handleResponse<{ data: AiGenerateResponse }>(
    await fetch(`${BASE}/ai/generate`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(payload),
    }),
  );
  return json.data;
}

export async function saveAsHqMedia(payload: SaveAsHqMediaPayload): Promise<{ id: string }> {
  const json = await handleResponse<{ data: { id: string } }>(
    await fetch(`${BASE}/hq/media`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(payload),
    }),
  );
  return json.data;
}
