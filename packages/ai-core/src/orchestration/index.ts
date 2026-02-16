/**
 * AI Orchestration Layer — Public API
 *
 * @example
 * ```ts
 * import { runAIInsight, onAudit } from '@o4o/ai-core/orchestration';
 *
 * const result = await runAIInsight({
 *   service: 'glycopharm',
 *   insightType: 'store-summary',
 *   contextData: { ... },
 *   user: { id: 'u1', role: 'glycopharm:operator' },
 * });
 * ```
 */

// Entry point
export { runAIInsight, onAudit } from './orchestrator.js';

// Types
export type {
  AIServiceId,
  AIProviderId,
  AIOrchestrationRequest,
  AIOrchestrationResult,
  AIInsight,
  RiskLevel,
  AIProvider,
  AIProviderConfig,
  AIProviderResponse,
  AIContext,
  ComposedPrompt,
  ActionMapping,
  AIAuditEntry,
  UsagePolicy,
} from './types.js';

// Action Keys (Hub ↔ AI ↔ Executor 통합 키)
export { ACTION_KEYS } from './action-keys.js';
export type { ActionKey } from './action-keys.js';

// Building blocks (for advanced usage / testing)
export { buildContext } from './context-builder.js';
export { composePrompt } from './prompt-composer.js';
export { normalizeResponse } from './response-normalizer.js';
export { mapActions } from './action-mapper.js';

// Providers
export { GeminiProvider } from './providers/gemini.provider.js';
export { OpenAIProvider } from './providers/openai.provider.js';
