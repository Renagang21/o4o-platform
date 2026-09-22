/**
 * O4O Main Automation Core 를 소비하는 두 HTTP 표면 — 병원약국 서비스는 자체 AI 엔진을 만들지 않는다.
 *
 *   1) POST /api/ai/request  (surface='hospital-drug')  — 병동 자연어 조사/원내 결합.
 *      원내 데이터가 브라우저에 있으면 localSource='client' 를 실어 서버 원내 조회를 끄고(research/question),
 *      원내 결합은 브라우저에서 한다(D2 Local-first).
 *   2) POST /api/ai/file-understanding (약제부) — 임의 표 파일 → 공통 GFU 구조 이해.
 *      targetSchema 는 이 클라이언트가 주입한다(@o4o/hospital-pharmacy-core) — api-server 는 병원 어휘를 갖지 않는다.
 *
 * 절대 URL 을 넘겨 authClient 의 /api/v1 base 를 덮어쓴다(AI 엔드포인트는 /api/ai/*).
 */

import { api, API_BASE_URL } from './apiClient';
import { AI_SURFACE } from '../config/service';
import type { HospitalTargetSchema } from '@o4o/hospital-pharmacy-core';

export class AiRequestError extends Error {
  constructor(message: string, readonly code: string, readonly status?: number) {
    super(message);
    this.name = 'AiRequestError';
  }
}

// ── 병동: 자연어 조사 (surface='hospital-drug') ────────────────────────────
export interface HospitalChatReply {
  kind: 'chat';
  reason: string;
  message: string;
  plan: string;
}
export interface HospitalWorkReply {
  kind: 'work';
  reason: string;
  work: unknown;
}
export type HospitalRequestReply = HospitalChatReply | HospitalWorkReply;

export async function sendHospitalRequest(input: {
  text: string;
  /** 원내 데이터가 브라우저에 연결돼 있으면 'client' — 서버 원내 조회를 끄고 결합은 브라우저에서. */
  localSource?: 'client';
}): Promise<HospitalRequestReply> {
  try {
    const res = await api.post(`${API_BASE_URL}/api/ai/request`, {
      text: input.text,
      surface: AI_SURFACE,
      ...(input.localSource ? { localSource: input.localSource } : {}),
    });
    const data = res?.data?.data as
      | { kind: 'chat'; reason: string; chat: { message: string; plan: string } }
      | { kind: 'work'; reason: string; work: unknown }
      | undefined;
    if (!data || typeof data.kind !== 'string') {
      throw new AiRequestError('응답을 생성하지 못했습니다. 다시 시도해 주세요.', 'AI_ERROR');
    }
    if (data.kind === 'work') {
      return { kind: 'work', reason: data.reason, work: data.work };
    }
    return { kind: 'chat', reason: data.reason, message: data.chat.message, plan: data.chat.plan };
  } catch (err) {
    if (err instanceof AiRequestError) throw err;
    const resp = (err as { response?: { status?: number; data?: { error?: string; code?: string } } }).response;
    if (resp) {
      throw new AiRequestError(resp.data?.error || '응답을 생성하지 못했습니다. 다시 시도해 주세요.', resp.data?.code || 'AI_ERROR', resp.status);
    }
    throw new AiRequestError('네트워크 오류가 발생했습니다. 다시 시도해 주세요.', 'NETWORK_ERROR');
  }
}

// ── 약제부: 파일 이해 (공통 GFU) ───────────────────────────────────────────
export interface FileUnderstandingReply {
  records: { fields: Record<string, string>; sectionLabel?: string; sheetName: string; sourceRow: number }[];
  verdict: { ok: boolean; missingRequired: string[]; lowConfidenceColumns: { targetField: string; confidence: number }[] };
  /** verdict.ok 가 아니면 사용자에게 물을 한국어 문구, ok 면 null. */
  question: string | null;
  totalRows: number;
  skipped: number;
  model: string;
}

/** File → base64 (브라우저). 청크로 잘라 큰 파일에서 스택 초과를 피한다. */
async function fileToBase64(file: File): Promise<string> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  let bin = '';
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    bin += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(bin);
}

export async function requestFileUnderstanding(
  file: File,
  targetSchema: HospitalTargetSchema,
): Promise<FileUnderstandingReply> {
  const fileBase64 = await fileToBase64(file);
  try {
    const res = await api.post(`${API_BASE_URL}/api/ai/file-understanding`, {
      fileBase64,
      targetSchema,
    });
    const data = res?.data?.data as FileUnderstandingReply | undefined;
    if (!data || !Array.isArray(data.records)) {
      throw new AiRequestError('파일을 이해하지 못했습니다. 다시 시도해 주세요.', 'FILE_UNDERSTANDING_FAILED');
    }
    return data;
  } catch (err) {
    if (err instanceof AiRequestError) throw err;
    const resp = (err as { response?: { status?: number; data?: { error?: string; code?: string } } }).response;
    if (resp) {
      throw new AiRequestError(resp.data?.error || '파일을 이해하지 못했습니다. 다시 시도해 주세요.', resp.data?.code || 'FILE_UNDERSTANDING_FAILED', resp.status);
    }
    throw new AiRequestError('네트워크 오류가 발생했습니다. 다시 시도해 주세요.', 'NETWORK_ERROR');
  }
}
