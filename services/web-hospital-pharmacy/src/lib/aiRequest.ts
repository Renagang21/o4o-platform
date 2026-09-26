/**
 * O4O Main Automation Core 를 소비하는 두 HTTP 표면 — 병원약국 서비스는 자체 AI 엔진을 만들지 않는다.
 *
 *   1) POST /api/hospital/ai/request   — 자연어 약품 조사(surface='hospital-drug').
 *      서버는 원내 조회를 열지 않는다(suppressLocal). 원내 결합은 브라우저가 실제 파일에서 읽은 Local Context 로 한다.
 *   2) POST /api/hospital/ai/structure — 원내 파일 구조 이해. **StructureProfile(상단 표본 + 열 통계)만** 보낸다.
 *      전체 파일은 보내지 않는다(§18) — decode·정규화는 브라우저가 @o4o/file-understanding-core 로 한다.
 *
 * 무로그인(§1) — 두 엔드포인트 모두 개인 인증 · device credential 없이 호출한다(서버는 rate limit 으로 보호).
 */

import type { FileStructureInference, StructureProfile } from '@o4o/file-understanding-core';
import type { HospitalTargetSchema } from '@o4o/hospital-pharmacy-core';
import { hospitalFetch } from './apiClient';

export class AiRequestError extends Error {
  constructor(message: string, readonly code: string, readonly status?: number) {
    super(message);
    this.name = 'AiRequestError';
  }
}

// ── 자연어 조사 (surface='hospital-drug') ─────────────────────────────────
export interface HospitalRequestReply {
  kind: 'chat' | 'work';
  message: string;
  plan: string;
}

export async function sendHospitalRequest(input: { text: string }): Promise<HospitalRequestReply> {
  let result;
  try {
    result = await hospitalFetch<HospitalRequestReply>('/api/hospital/ai/request', {
      method: 'POST',
      body: { text: input.text },
    });
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

// ── 파일 구조 이해 (공통 GFU · profile 만) ─────────────────────────────────
export async function requestFileStructure(
  profile: StructureProfile,
  targetSchema: HospitalTargetSchema,
): Promise<{ inference: FileStructureInference; model: string }> {
  let result;
  try {
    result = await hospitalFetch<{ inference: FileStructureInference; model: string }>('/api/hospital/ai/structure', {
      method: 'POST',
      body: { profile, targetSchema },
    });
  } catch {
    throw new AiRequestError('네트워크 오류가 발생했습니다. 다시 시도해 주세요.', 'NETWORK_ERROR');
  }
  const { ok, status, body } = result;
  if (!ok || !body?.success || !body.data?.inference) {
    throw new AiRequestError(
      body?.error || '파일 구조를 이해하지 못했습니다. 다시 시도해 주세요.',
      body?.code || 'FILE_UNDERSTANDING_FAILED',
      status,
    );
  }
  return body.data;
}
