import { executeAccountedAi } from '../modules/ai-policy/ai-accounted-execution.js';
/**
 * Copilot Engine Service
 *
 * WO-O4O-COPILOT-ENGINE-INTEGRATION-V1
 *
 * Platform-wide AI insight generator for Operator Dashboards.
 * Called in-process by each service's operator-dashboard controller.
 *
 * Strategy:
 *   1. Always run enhanced rule-based analysis (fast, deterministic)
 *   2. If AI API key configured, run a service-specific business Extension through @o4o/ai-core
 *   3. AI call uses the existing 800ms provider timeout — falls back to rule-based on failure
 *   4. Returns AiSummaryItem[] (max 3) for aiSummary block
 */

import type { AIServiceId, AIInsight } from '@o4o/ai-core';
import { randomUUID } from 'node:crypto';
import { createOperatorInsightExtension } from '../services/ai-extensions/operator-insight.extension.js';
import { resolveServiceAiProfile } from '../services/ai-extensions/service-query.extension.js';
import { resolveAiTarget } from '../utils/ai-provider-runtime.js';
import { AppDataSource } from '../database/connection.js';
import logger from '../utils/logger.js';
import { generateRuleBasedInsights } from './insight-rules.js';
import type { AiSummaryItem } from '../types/operator-dashboard.types.js';

/** Timeout for AI provider calls (ms) */
const AI_TIMEOUT_MS = 800;

/**
 * Check if an AI provider API key is configured.
 */
function hasAiApiKey(): boolean {
  return !!(process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY);
}

/**
 * Transform AIInsight (from @o4o/ai-core) into AiSummaryItem[] (for operator-ux-core).
 */
function transformInsightToSummary(insight: AIInsight): AiSummaryItem[] {
  const items: AiSummaryItem[] = [];

  // Main summary as primary insight
  const mainLevel: AiSummaryItem['level'] =
    insight.riskLevel === 'high' ? 'critical' :
    insight.riskLevel === 'medium' ? 'warning' :
    'info';

  items.push({
    id: 'ai-insight-main',
    message: insight.summary,
    level: mainLevel,
  });

  // Top recommended actions as additional insights
  for (let i = 0; i < Math.min(insight.recommendedActions.length, 2); i++) {
    items.push({
      id: `ai-action-${i}`,
      message: insight.recommendedActions[i],
      level: 'info',
    });
  }

  return items.slice(0, 3);
}

export class CopilotEngineService {
  /**
   * Generate AI-powered insights for an operator dashboard.
   *
   * @param service - Which service is requesting insights
   * @param metrics - Structured metrics from the dashboard controller's DB queries
   * @param user - Requesting user (for audit trail)
   * @returns AiSummaryItem[] (max 3 items)
   */
  async generateInsights(
    service: string,
    metrics: Record<string, unknown>,
    user: { id: string; role: string },
  ): Promise<{ insights: AiSummaryItem[]; source: 'ai' | 'rule-based' }> {
    // 1. Always generate rule-based insights (fast fallback)
    const profile = resolveServiceAiProfile(service);
    if (!profile || !user.id) throw new Error('SERVICE_OR_ACTOR_UNSUPPORTED');
    const legacyService: AIServiceId | undefined = profile.serviceId === 'kpa-society' ? 'kpa' : profile.serviceId === 'neture' ? 'neture' : undefined;
    const ruleBasedInsights = legacyService ? generateRuleBasedInsights(legacyService, metrics) : [];

    // 2. Try AI-enhanced insights if API key is available
    if (hasAiApiKey()) {
      try {
        const { runAiExtension } = await import('@o4o/ai-core');
        const target = await resolveAiTarget(AppDataSource, undefined, 'operator.insight');
        const extension = createOperatorInsightExtension(profile);
        const run = await runAiExtension({
          extension, input: { metrics },
          context: { requestId: randomUUID(), serviceId: profile.serviceId, featureId: 'operator-insight', actorId: user.id, audience: 'staff' },
          materials: [], funding: { payer: 'platform' },
        }, {
          invoke: async prompt => {
            const result = await executeAccountedAi(AppDataSource, { ...prompt, provider: target.provider,
              config: { apiKey: target.apiKey, model: target.model, maxTokens: 2048, temperature: 0.3 },
              timeoutMs: AI_TIMEOUT_MS, retry: { maxAttempts: 1 },
              meta: { service: profile.serviceId, callerName: extension.id },
            }, { scope: 'OPERATOR_INSIGHT', serviceKey: profile.serviceId, userId: user.id });
            return { ...result, provider: result.provider ?? target.provider };
          },
        }, {
          // The existing admin guard authorizes caller-submitted aggregates, not domain record access.
          authorize: async context => context.actorId === user.id,
          record: async event => { logger.info('[AI_EXTENSION]', event); },
        });
        return { insights: transformInsightToSummary(run.output), source: 'ai' };
      } catch (error) {
        // AI unavailable or timed out — fall through to rule-based
        const msg = error instanceof Error ? error.message : String(error);
        console.warn(`[CopilotEngine] AI call failed for ${service}: ${msg}`);
      }
    }

    // 3. Return rule-based insights
    return { insights: ruleBasedInsights, source: 'rule-based' };
  }
}
