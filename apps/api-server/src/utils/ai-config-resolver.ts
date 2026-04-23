/**
 * AI Config Resolver — WO-O4O-AI-CORE-SERVICE-UNIFICATION-V1
 *
 * 7개 도메인 서비스의 buildProviderConfig() 중복 코드를 대체하는 팩토리.
 * DataSource + service scope → AIProviderConfig resolver callback.
 *
 * 해결 우선순위:
 *   1. ai_model_settings 테이블 → model, temperature, maxTokens
 *   2. ai_settings 테이블 → apiKey (provider='gemini')
 *   3. process.env.GEMINI_API_KEY (fallback)
 */

import type { DataSource } from 'typeorm';
import type { AIProviderConfig } from '@o4o/ai-core';
// AiModelSetting removed — WO-O4O-GLYCOPHARM-CARE-REMOVAL-V1
import { resolveAiApiKey } from './ai-key.util.js';

export function buildConfigResolver(
  dataSource: DataSource,
  service: 'store',
  overrides?: { maxTokens?: number },
): () => Promise<AIProviderConfig> {
  return async (): Promise<AIProviderConfig> => {
    const model = 'gemini-2.5-flash';
    const temperature = 0.3;
    const maxTokens = overrides?.maxTokens ?? 2048;
    const apiKey = await resolveAiApiKey(dataSource, 'gemini');
    return { apiKey, model, temperature, maxTokens };
  };
}
