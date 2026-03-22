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
import { AiModelSetting } from '../modules/care/entities/ai-model-setting.entity.js';

export function buildConfigResolver(
  dataSource: DataSource,
  service: 'care' | 'store',
  overrides?: { maxTokens?: number },
): () => Promise<AIProviderConfig> {
  return async (): Promise<AIProviderConfig> => {
    // 1. ai_model_settings → model, temperature, maxTokens
    let setting: AiModelSetting | null = null;
    try {
      const repo = dataSource.getRepository(AiModelSetting);
      setting = await repo.findOne({ where: { service } });
    } catch {
      // Table may not exist yet
    }

    const model = setting?.model || 'gemini-3.0-flash';
    const temperature = setting ? Number(setting.temperature) : 0.3;
    const maxTokens = overrides?.maxTokens ?? setting?.maxTokens ?? 2048;

    // 2. ai_settings → apiKey
    let apiKey = '';
    try {
      const rows = await dataSource.query(
        `SELECT apikey FROM ai_settings WHERE provider = 'gemini' AND isactive = true LIMIT 1`,
      );
      if (rows[0]?.apikey) {
        apiKey = rows[0].apikey;
      }
    } catch {
      // DB read failed — fall through to env
    }

    if (!apiKey) {
      apiKey = process.env.GEMINI_API_KEY || '';
    }

    return { apiKey, model, temperature, maxTokens };
  };
}
