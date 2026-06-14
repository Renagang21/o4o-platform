/**
 * ai-editing-model-resolver
 *
 * WO-O4O-AI-MODEL-SELECTION-RUNTIME-RESOLVER-V1
 *
 * 편집 AI 생성 endpoint(`/api/ai/content`, `url-to-blocks`, `vision/analyze`,
 * `course-structure`, `lesson-body`, `content-to-store-use`)가 모델 id 를
 * **하드코딩하지 않고 admin 선택값에서 결정**하도록 하는 단일 resolver.
 *
 * SSOT(1차) = `AiQueryPolicy.defaultModel`
 *   - admin 의 엔진 활성화(`aiAdminService.activateEngine`)가 `defaultModel = engine.slug` 로 기록.
 *   - `/api/ai/query` 도 동일 값(`policy.defaultModel`)을 사용 → 편집 AI 도 같은 값을 읽어 정합.
 *
 * 우선순위:
 *   1. `AiQueryPolicy.defaultModel` (id=1) — gemini whitelist 에 포함될 때
 *   2. `process.env.AI_DEFAULT_MODEL` — gemini whitelist 에 포함될 때
 *   3. 하드코딩 fallback `gemini-2.5-flash`
 *
 * 경계(엄수):
 * - **provider 교체는 본 WO 범위 밖.** 편집 경로는 gemini-only(`generateRawContent` 가 provider 강제) →
 *   resolver 도 gemini whitelist 로 검증, 비-gemini 값이면 fallback. provider 추상화 수렴은 후속 WO.
 * - **읽기 실패가 AI 생성을 깨뜨리면 안 된다** → 모든 경로 try/catch, 항상 유효한 모델 반환.
 * - `AiLlmPolicy` / `AiSettings` / `ai_model_settings` 통합은 본 WO 미포함(후속).
 */

import { AppDataSource } from '../database/connection.js';
import { AiQueryPolicy } from '../entities/AiQueryPolicy.js';
import { MODEL_WHITELIST } from '../types/ai-proxy.types.js';
// WO-O4O-AI-PROVIDER-ABSTRACTION-CALLPROVIDER-ALIGNMENT-V1: provider×surface guardrail
import { isProviderAllowedForSurface, type AiProviderKey, type EditingSurface } from '@o4o/types';
import logger from './logger.js';

/** 편집 경로 최종 fallback (gemini whitelist 의 canonical 모델). */
export const EDITING_MODEL_FALLBACK = 'gemini-2.5-flash';

const GEMINI_ALLOWED = MODEL_WHITELIST.gemini as readonly string[];

function isGeminiModel(model: string | null | undefined): model is string {
  return !!model && GEMINI_ALLOWED.includes(model.trim());
}

/** env override → gemini whitelist 검증 후 채택, 아니면 하드코딩 fallback. */
function envFallback(): string {
  const env = process.env.AI_DEFAULT_MODEL?.trim();
  return isGeminiModel(env) ? (env as string) : EDITING_MODEL_FALLBACK;
}

/**
 * 편집 AI 생성에 사용할 모델 id 를 결정한다.
 * admin 선택값(AiQueryPolicy.defaultModel) → env → 하드코딩 fallback 순.
 * 어떤 경우에도 gemini whitelist 에 포함된 유효 모델을 반환한다(throw 없음).
 */
export async function resolveEditingModel(): Promise<string> {
  const fallback = envFallback();
  try {
    if (!AppDataSource.isInitialized) return fallback;
    const policy = await AppDataSource.getRepository(AiQueryPolicy).findOne({ where: { id: 1 } });
    const model = policy?.defaultModel?.trim();
    if (isGeminiModel(model)) return model as string;
    // policy 에 비-gemini 모델이 설정된 경우: 편집 경로는 gemini-only → provider 교체(후속 WO) 전까지 fallback.
    if (model) {
      logger.warn('resolveEditingModel: policy.defaultModel not gemini-compatible, using fallback', {
        policyModel: model,
        fallback,
      });
    }
    return fallback;
  } catch (err) {
    logger.warn('resolveEditingModel: policy read failed, using fallback', {
      error: (err as Error)?.message,
      fallback,
    });
    return fallback;
  }
}

// ─── provider abstraction gate (WO-O4O-AI-PROVIDER-ABSTRACTION-CALLPROVIDER-ALIGNMENT-V1) ───

/** model id 접두사로 편집 AI provider 키 판별(미지정/gemini-* → gemini 기본). */
function deriveProviderFromModel(model: string | null | undefined): AiProviderKey {
  const m = (model || '').trim().toLowerCase();
  if (m.startsWith('qwen')) return 'qwen';
  if (m.startsWith('deepseek')) return 'deepseek';
  return 'gemini';
}

/**
 * `/api/ai/content`·`content-to-store-use` 의 outputType → 편집 surface 매핑.
 * 매핑 안 되는 outputType(summary/title_suggest/store_sns/flexible)은 undefined → gemini.
 */
export function editingSurfaceForOutputType(outputType?: string): EditingSurface | undefined {
  switch (outputType) {
    case 'pop': return 'pop';
    case 'store_qr': return 'qr';
    case 'blog': return 'blog';
    case 'product_detail': return 'product-description';
    default: return undefined;
  }
}

export interface ResolvedEditingProvider {
  provider: AiProviderKey;
  model: string;
}

/**
 * 편집 AI 생성에 사용할 **provider + model** 을 guardrail 로 결정한다.
 * - 의도 provider = `AiQueryPolicy.defaultModel` 접두사로 판별.
 * - gemini → gemini-검증 모델 반환(현행 기본).
 * - 비-gemini → **surface 가 provider 의 allowedSurface 에 포함될 때만** 비-gemini 결정, 아니면 **gemini fallback**.
 * - throw 없음. (비-gemini transport 실제 호출은 후속 WO — 서비스 wrapper 가 gemini 로 안전 강등.)
 */
export async function resolveEditingProvider(args: { surface?: EditingSurface } = {}): Promise<ResolvedEditingProvider> {
  const geminiModel = await resolveEditingModel();
  let rawModel: string | undefined;
  try {
    if (AppDataSource.isInitialized) {
      const policy = await AppDataSource.getRepository(AiQueryPolicy).findOne({ where: { id: 1 } });
      rawModel = policy?.defaultModel?.trim() || undefined;
    }
  } catch {
    // 정책 read 실패 → gemini fallback
  }
  const intended = deriveProviderFromModel(rawModel);
  if (intended === 'gemini') return { provider: 'gemini', model: geminiModel };
  // 비-gemini: guardrail 통과 surface 에서만 비-gemini 결정.
  if (args.surface && isProviderAllowedForSurface(intended, args.surface)) {
    return { provider: intended, model: rawModel as string };
  }
  return { provider: 'gemini', model: geminiModel };
}
