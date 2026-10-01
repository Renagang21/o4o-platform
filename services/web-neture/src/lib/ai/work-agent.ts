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

/**
 * 대상 준비 요약(안전 필드만) — 서버 `target` 을 그대로 받는다.
 * `targetType` 으로 등재 사이트(browser_site)인지 Windows 프로그램(windows_app)인지 구분해
 * "Chrome 화면 / 프로그램 화면" 안내 문구를 갈라 쓴다(PC 작업에 'Chrome' 을 쓰지 않기 위해서다).
 */
export interface WorkTargetSummary {
  targetType: 'browser_site' | 'windows_app';
  displayName: string;
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
  target: WorkTargetSummary | null;
  /**
   * PHASE 1 same-run(WO-O4O-WEB-AUTOMATION-USER-GUIDED-RESUME-AND-WORKFLOW-CANDIDATE-REPLAY-V1): QUESTION 으로 멈춘 run 의
   * 재개 앵커(opaque). `resumable=true` 일 때만 다음 요청에 `runId` 를 실어 같은 업무를 잇는다. UI 는 값을 해석하지 않는다.
   */
  runId?: string | null;
  resumable?: boolean;
}

/** 서버가 재개를 확정적으로 거부했다(없음 · 비소유 · 종료 · 만료 · 비대기 · 경합). */
export const WORK_AGENT_RESUME_REJECTED = 'WORK_AGENT_RESUME_REJECTED';

/** 재개 앵커 — 대기 중인 run 과 그 run 의 원래 대상(opaque). 다음 요청에 runId · targetHint 로 싣는다. */
export interface ResumeAnchor {
  runId: string;
  targetId: string | null;
}

/**
 * Work 응답 뒤 다음 요청에 실을 재개 앵커(WO-O4O-MAIN-AUTOMATION-RESUME-AND-REPLAY-PREFLIGHT-FIX-V1 §2-B·§2-C).
 * 재개 시도 한 번 실패로 대기 중인 run 을 잃지 않는다:
 *   - 이번 응답이 QUESTION(resumable) → 그 runId + 그 run 의 대상(goal.siteId)
 *   - 재개 거부(RESUME_REJECTED) · run 이 열린 채 끝남(완료 · 인계 · 중지) → 해제
 *   - run 을 열기 전에 멈춤(runId 없음 — 대상 준비 실패 등) → 서버 run 은 그대로 대기 중이므로 직전 앵커 유지
 */
export function nextResumeAnchor(
  prev: ResumeAnchor | null,
  work: Pick<WorkAgentResult, 'runId' | 'resumable' | 'errorCode'> & { goal?: Pick<WorkAgentResult['goal'], 'siteId'> },
): ResumeAnchor | null {
  if (work.resumable && work.runId) return { runId: work.runId, targetId: work.goal?.siteId ?? prev?.targetId ?? null };
  if (work.errorCode === WORK_AGENT_RESUME_REJECTED) return null;
  if (work.runId) return null;
  return prev;
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
