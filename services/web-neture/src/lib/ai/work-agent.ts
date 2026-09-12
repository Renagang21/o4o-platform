/**
 * Goal-Driven Work Agent — client
 *
 * WO-O4O-GOAL-DRIVEN-MULTIMODAL-WORK-AGENT-V0 §5·§11·§20·§48
 *
 *   Home 중앙 입력창의 문장을 **목적(Goal)** 으로 보내고, 필요하면 사용자가 붙여넣거나 고른 이미지 한 장을 함께 보낸다.
 *   서버는 등록된 사이트 탭을 관찰·행동한 뒤 적절한 지점에서 멈추고, Chrome 의 실제 화면은 그대로 둔다(§20).
 *   이미지는 어디에도 저장하지 않는다 — 요청 뒤 버린다(§23). 캔버스 재인코딩이라 EXIF 등 메타데이터는 함께 사라진다.
 */

import { api, API_BASE_URL } from '../apiClient';

export const WORK_IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const WORK_IMAGE_MAX_BYTES = 7 * 1024 * 1024;
const WORK_IMAGE_MAX_DIMENSION = 1600;

export interface WorkAgentStep {
  step: number;
  kind: string;
  status: 'success' | 'failed' | 'denied' | 'rejected';
  errorCode: string | null;
  navigated: boolean;
}

export interface WorkAgentResult {
  goal: { goalId: string; status: 'active' | 'waiting_for_user' | 'completed' | 'stopped'; siteId: string | null; displayName: string };
  progress: 'progress' | 'no_progress' | 'needs_user' | 'completed' | 'failed';
  takeover: { reason: string; step: number } | null;
  neededInput: string | null;
  stepCount: number;
  aiPlanCount: number;
  path: string | null;
  history: WorkAgentStep[];
  message: string;
  errorCode: string | null;
}

export class WorkAgentError extends Error {
  constructor(message: string, readonly code: string, readonly status?: number) {
    super(message);
    this.name = 'WorkAgentError';
  }
}

export function isSupportedWorkImage(file: File | Blob): boolean {
  return (WORK_IMAGE_MIME_TYPES as readonly string[]).includes(file.type);
}

/** 파일 → base64(JPEG, 긴 변 1600 이하). */
export async function readWorkImage(file: File | Blob): Promise<{ mimeType: 'image/jpeg'; base64: string }> {
  if (!isSupportedWorkImage(file)) throw new WorkAgentError('JPEG · PNG · WebP 이미지만 첨부할 수 있습니다.', 'WORK_AGENT_IMAGE_INVALID');
  if (file.size > WORK_IMAGE_MAX_BYTES) throw new WorkAgentError('이미지가 너무 큽니다(최대 7MB).', 'WORK_AGENT_IMAGE_INVALID');
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new WorkAgentError('이미지를 읽지 못했습니다.', 'WORK_AGENT_IMAGE_INVALID'));
      el.src = url;
    });
    const scale = Math.min(1, WORK_IMAGE_MAX_DIMENSION / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new WorkAgentError('이미지를 처리하지 못했습니다.', 'WORK_AGENT_IMAGE_INVALID');
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return { mimeType: 'image/jpeg', base64: canvas.toDataURL('image/jpeg', 0.9).replace(/^data:[^;]+;base64,/, '') };
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function runWorkAgent(request: string, image?: { mimeType: string; base64: string }): Promise<WorkAgentResult> {
  try {
    const res = await api.post(`${API_BASE_URL}/api/ai/work-agent/run`, { request, ...(image ? { image } : {}) });
    const data = res?.data?.data as WorkAgentResult | undefined;
    if (!data || typeof data.message !== 'string') throw new WorkAgentError('작업을 수행하지 못했습니다. 다시 시도해 주세요.', 'WORK_AGENT_FAILED');
    return data;
  } catch (err) {
    if (err instanceof WorkAgentError) throw err;
    const resp = (err as { response?: { status?: number; data?: { error?: string; code?: string } } }).response;
    if (resp) throw new WorkAgentError(resp.data?.error || '작업을 수행하지 못했습니다. 다시 시도해 주세요.', resp.data?.code || 'WORK_AGENT_FAILED', resp.status);
    throw new WorkAgentError('네트워크 오류가 발생했습니다. 다시 시도해 주세요.', 'NETWORK_ERROR');
  }
}
