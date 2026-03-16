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
 *   2. If AI API key configured, also call runAIInsight() from @o4o/ai-core
 *   3. AI call has 3s timeout — falls back to rule-based on failure
 *   4. Returns AiSummaryItem[] (max 3) for aiSummary block
 */

import type { AIServiceId, AIInsight } from '@o4o/ai-core';
import { generateRuleBasedInsights } from './insight-rules.js';
import type { AiSummaryItem } from '../types/operator-dashboard.types.js';

/** Timeout for AI provider calls (ms) */
const AI_TIMEOUT_MS = 3000;

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

/**
 * Create a timeout promise that rejects after the specified duration.
 */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('AI_TIMEOUT')), ms);
    promise.then(
      (value) => { clearTimeout(timer); resolve(value); },
      (error) => { clearTimeout(timer); reject(error); },
    );
  });
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
    service: AIServiceId,
    metrics: Record<string, unknown>,
    user: { id: string; role: string },
  ): Promise<{ insights: AiSummaryItem[]; source: 'ai' | 'rule-based' }> {
    // 1. Always generate rule-based insights (fast fallback)
    const ruleBasedInsights = generateRuleBasedInsights(service, metrics);

    // 2. Try AI-enhanced insights if API key is available
    if (hasAiApiKey()) {
      try {
        const { runAIInsight } = await import('@o4o/ai-core');

        const aiResult = await withTimeout(
          runAIInsight({
            service,
            insightType: 'operator-dashboard',
            contextData: metrics,
            user,
          }),
          AI_TIMEOUT_MS,
        );

        if (aiResult.success && aiResult.insight) {
          const aiInsights = transformInsightToSummary(aiResult.insight);
          return { insights: aiInsights, source: 'ai' };
        }
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
