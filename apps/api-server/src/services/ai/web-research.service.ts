/**
 * Web Research Service — 범용 Gemini Web Research(grounding) 소비자
 *
 * WO-O4O-COMMON-AUTOMATION-CORE-CAPABILITY-A-GEMINI-WEB-RESEARCH-V1 (Capability A 종료 게이트)
 *
 * 목적: `@o4o/ai-core` 의 grounding capability 를 admin 이 선택한 모델로 실제 호출하는
 *       **단 하나의 범용 소비자**. 모델은 하드코딩하지 않고 admin SSOT 에서 해석한다.
 *
 *   admin.neture.co.kr → AiQueryPolicy.defaultModel
 *     → resolveEditingModel()            (기존 모델 SSOT resolver — 새 설정 체계 신설 금지)
 *     → runWebResearch(query)
 *     → execute({ provider:'gemini', model: resolvedModel, grounding:true })
 *
 * 경계(엄수):
 * - **범용이다.** 특정 약품·사이트(health.kr/HIRA/MFDS)·서비스 로직을 넣지 않는다.
 * - **HTTP route 없음.** 내부 service 함수만. 인증/guard/route contract 신설 없음.
 * - `/hospital-drug` 에 붙이지 않는다. 실업무 연결은 단계 D.
 * - 모델은 `resolveEditingModel()` 이 준 값만 쓴다(`AI_DEFAULT_MODEL`/새 모델 강제 금지 · fallback=GEMINI_CANONICAL_MODEL).
 * - grounding 은 gemini 전용 → provider 는 항상 'gemini'.
 * - API 키는 env/Secret(ai_settings)에서만 주입(`resolveAiApiKey`) · 코드·로그에 기록하지 않는다.
 */

import { execute } from '@o4o/ai-core';
import type { AIGroundingMetadata } from '@o4o/ai-core';
import { AppDataSource } from '../../database/connection.js';
import { resolveEditingModel } from '../../utils/ai-editing-model-resolver.js';
import { resolveAiApiKey } from '../../utils/ai-key.util.js';

const DEFAULT_SYSTEM_PROMPT =
  '너는 근거를 검색해 답하는 범용 리서치 어시스턴트다. 최신 웹 검색 결과에 근거해 간결하고 정확하게 답하라.';

export interface WebResearchRequest {
  /** 리서치 질의(범용) */
  query: string;
  /** system prompt override (기본: 범용 리서치 어시스턴트) */
  systemPrompt?: string;
  /** provider 타임아웃(ms) */
  timeoutMs?: number;
}

export interface WebResearchResult {
  /** 응답 본문(grounding=text 경로) */
  content: string;
  /** 실제 호출에 사용된 모델(admin SSOT 해석 결과) */
  model: string;
  /** grounding 근거 메타데이터(used/queries/sources) — 비-grounding 응답엔 없음 */
  grounding?: AIGroundingMetadata;
  /** 요청 고유 ID */
  requestId: string;
}

/**
 * 범용 Web Research 실행.
 *
 * admin 이 선택한 모델(`AiQueryPolicy.defaultModel`)을 `resolveEditingModel()` 로 해석해
 * Gemini Google Search grounding 으로 실제 호출한다. 모델을 인자로 강제하지 않는다.
 *
 * @throws execute() 의 실패(키 부재·provider 오류 등)를 그대로 전파 — 호출측이 에러 전략 결정.
 */
export async function runWebResearch(request: WebResearchRequest): Promise<WebResearchResult> {
  // 1. admin SSOT → 모델 해석 (하드코딩 금지, resolver 가 항상 유효한 gemini 모델 반환)
  const model = await resolveEditingModel();

  // 2. Gemini 키 해석 (ai_settings → env, 코드/로그에 기록하지 않음)
  const apiKey = await resolveAiApiKey(AppDataSource, 'gemini');

  // 3. 범용 grounding 호출 — model 은 admin 해석값, provider 는 gemini 고정
  const result = await execute({
    systemPrompt: request.systemPrompt ?? DEFAULT_SYSTEM_PROMPT,
    userPrompt: request.query,
    provider: 'gemini',
    grounding: true,
    config: { apiKey, model },
    timeoutMs: request.timeoutMs,
    meta: { service: 'web-research', callerName: 'runWebResearch' },
  });

  return {
    content: result.content,
    model: result.model,
    grounding: result.grounding,
    requestId: result.requestId,
  };
}
