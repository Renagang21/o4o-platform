/**
 * O4O Main Automation Core 를 소비하는 두 HTTP 표면 — 병원약국 서비스는 자체 AI 엔진을 만들지 않는다.
 *
 *   1) POST /api/hospital/ai/request           — 병동 자연어 조사(surface='hospital-drug').
 *      device 스코프이므로 서버는 원내 조회를 열지 않는다(suppressLocal). 원내 결합은 브라우저에서 한다(§13).
 *   2) POST /api/hospital/ai/file-understanding — 약제부 임의 표 파일 → 공통 GFU 구조 이해.
 *      targetSchema 는 이 클라이언트가 주입한다(@o4o/hospital-pharmacy-core).
 *
 * 두 엔드포인트 모두 **device credential(HttpOnly 쿠키)** 로 접근한다(로그인리스 §4·§6·§7).
 * 따라서 authClient(Bearer) 가 아니라 credentials:'include' fetch(hospitalFetch)를 쓴다.
 * device 미연결/폐기 시 401 HOSPITAL_DEVICE_REQUIRED — 화면이 재연결 UX 로 되돌린다(§16).
 */

import { hospitalFetch } from './apiClient';
import type { HospitalTargetSchema } from '@o4o/hospital-pharmacy-core';

/** device 재연결이 필요한 상태를 뜻하는 에러 코드(§16). */
export const DEVICE_REQUIRED_CODE = 'HOSPITAL_DEVICE_REQUIRED';

export class AiRequestError extends Error {
  constructor(message: string, readonly code: string, readonly status?: number) {
    super(message);
    this.name = 'AiRequestError';
  }
  /** device 쿠키가 없거나 폐기됨 → 재연결 필요. */
  get deviceRequired(): boolean {
    return this.status === 401 || this.code === DEVICE_REQUIRED_CODE;
  }
}

// ── 병동: 자연어 조사 (surface='hospital-drug') ────────────────────────────
export interface HospitalChatReply {
  kind: 'chat';
  message: string;
  plan: string;
}
export interface HospitalWorkReply {
  kind: 'work';
  message: string;
  plan: string;
}
export type HospitalRequestReply = HospitalChatReply | HospitalWorkReply;

export async function sendHospitalRequest(input: { text: string }): Promise<HospitalRequestReply> {
  let result;
  try {
    result = await hospitalFetch<{ kind: 'chat' | 'work'; message: string; plan: string }>(
      '/api/hospital/ai/request',
      { method: 'POST', body: { text: input.text } },
    );
  } catch {
    throw new AiRequestError('네트워크 오류가 발생했습니다. 다시 시도해 주세요.', 'NETWORK_ERROR');
  }
  const { ok, status, body } = result;
  if (!ok || !body?.success) {
    throw new AiRequestError(
      body?.error || '응답을 생성하지 못했습니다. 다시 시도해 주세요.',
      body?.code || 'AI_ERROR',
      status,
    );
  }
  const data = body.data;
  if (!data || typeof data.kind !== 'string') {
    throw new AiRequestError('응답을 생성하지 못했습니다. 다시 시도해 주세요.', 'AI_ERROR');
  }
  return { kind: data.kind, message: data.message, plan: data.plan };
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
  let result;
  try {
    result = await hospitalFetch<FileUnderstandingReply>('/api/hospital/ai/file-understanding', {
      method: 'POST',
      body: { fileBase64, targetSchema },
    });
  } catch {
    throw new AiRequestError('네트워크 오류가 발생했습니다. 다시 시도해 주세요.', 'NETWORK_ERROR');
  }
  const { ok, status, body } = result;
  if (!ok || !body?.success) {
    throw new AiRequestError(
      body?.error || '파일을 이해하지 못했습니다. 다시 시도해 주세요.',
      body?.code || 'FILE_UNDERSTANDING_FAILED',
      status,
    );
  }
  const data = body.data;
  if (!data || !Array.isArray(data.records)) {
    throw new AiRequestError('파일을 이해하지 못했습니다. 다시 시도해 주세요.', 'FILE_UNDERSTANDING_FAILED');
  }
  return data;
}
