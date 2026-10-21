import { resolveManagedAiTarget, prepareManagedAiRequest } from '../../../services/ai-management/runtime-models.js';
import { AppDataSource } from '../../../database/connection.js';
import { executeAccountedAi } from '../../ai-policy/ai-accounted-execution.js';
/**
 * Operator AI LLM Service
 *
 * WO-O4O-AI-ACTION-LLM-UPGRADE-V3
 *
 * @o4o/ai-core의 execute()를 사용하여 OperatorContext를 LLM에 전달,
 * 동적 Action 추천을 JSON으로 생성한다.
 *
 * 안전장치:
 *  - 최대 3개 Action 제한
 *  - confidence < 0.6 필터
 *  - 3초 타임아웃 → 빈 배열 반환 (fallback)
 *  - JSON 스키마 검증
 *  - 60초 인메모리 캐시 (비용 절감)
 */

import { randomUUID, createHash } from 'node:crypto';
import { operatorActionsExtension } from './operator-actions.extension.js';
import type { OperatorContext, AiActionItem } from './operator-ai-action.service.js';
import logger from '../../../utils/logger.js';
import { GEMINI_CANONICAL_MODEL } from '../../../types/ai-proxy.types.js';

// ─── Service ───

export class OperatorAiLlmService {
  private cache = new Map<string, { actions: AiActionItem[]; expiresAt: number }>();
  /**
   * LLM 기반 Action 추천 생성.
   * 실패 시 빈 배열 반환 (caller가 Rule fallback 처리).
   */
  async generate(ctx: OperatorContext, actorId: string): Promise<AiActionItem[]> {
    if (!actorId) return [];
    const cacheKey = createHash('sha256').update(actorId + JSON.stringify(ctx)).digest('hex');
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() < cached.expiresAt) return cached.actions;

    try {
      // Dynamic import to avoid startup failure if ai-core not built
      const { runAiExtension } = await import('@o4o/ai-core');

      const previousProvider = process.env.GEMINI_API_KEY ? 'gemini' : 'openai';
      const { provider, model, apiKey } = await resolveManagedAiTarget(AppDataSource, 'operator.actions', { provider: previousProvider as 'gemini' | 'openai', model: previousProvider === 'gemini' ? GEMINI_CANONICAL_MODEL : 'gpt-4o-mini', apiKey: process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY || '' });
      if (!apiKey) return [];

      const run = await runAiExtension({
        extension: operatorActionsExtension, input: ctx,
        context: { requestId: randomUUID(), serviceId: 'neture', featureId: 'operator-actions', actorId, audience: 'staff' },
        materials: [], funding: { payer: 'platform' },
      }, {
        invoke: async prompt => {
          const result = await executeAccountedAi(AppDataSource, await prepareManagedAiRequest(AppDataSource, 'operator.actions', { ...prompt, provider, responseMode: 'json',
            config: { apiKey, model, maxTokens: 500, temperature: 0.2 },
            timeoutMs: 3000, retry: { maxAttempts: 1, delayMs: 0 },
            meta: { service: 'neture', callerName: 'OperatorAiLlm' },
          }), { scope: 'OPERATOR_ACTIONS', serviceKey: 'neture', userId: actorId });
          return { ...result, provider: result.provider ?? provider };
        },
      }, {
        // Existing requireAuth + requireNetureScope guards construct this aggregate-only input.
        authorize: async context => context.actorId === actorId,
        record: async event => { logger.info('[AI_EXTENSION]', event); },
      });
      const actions = run.output;
      // Bounded cache is actor AND input scoped; never share one operator's result with another context.
      if (this.cache.size >= 100) this.cache.clear();
      this.cache.set(cacheKey, { actions, expiresAt: Date.now() + 60_000 });
      logger.info('[OperatorAiLlm] Generated actions', { count: actions.length, provider, model });

      return actions;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      logger.warn(`[OperatorAiLlm] LLM call failed, returning empty: ${msg}`);
      return [];
    }
  }
}
