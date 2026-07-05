/**
 * AI API Key Resolver — WO-AI-KEY-UTIL-EXTRACT-V1
 *
 * Single source of truth for AI provider API key resolution.
 * Consolidates 5 independent implementations across the server.
 *
 * Priority:
 *   1. ai_settings table (provider = ?, "isEnabled" = true)
 *   2. process.env.{PROVIDER}_API_KEY
 *
 * Returns empty string if not found. Callers decide how to handle missing keys.
 */

import type { DataSource } from 'typeorm';
import logger from './logger.js';

const PROVIDER_ENV_KEYS: Record<string, string> = {
  gemini: 'GEMINI_API_KEY',
  openai: 'OPENAI_API_KEY',
  claude: 'CLAUDE_API_KEY',
};

/**
 * Resolve AI API key for a given provider.
 * Returns empty string if no key is found. Caller decides how to handle.
 *
 * WO-O4O-HEALTH-FUNCTIONAL-FOOD-STORE-DESCRIPTION-LIVE-QUOTA-RECOVERY-AND-RETRY-GATE-V1:
 *  - 운영 DB(o4o_platform) 실제 ai_settings 컬럼 = "apiKey" / "isEnabled" (둘 다 camelCase, 따옴표 필수).
 *    information_schema 실측 확정(2026-07-05): id,provider,apiKey,isEnabled,config,createdAt,updatedAt.
 *    직전 코드의 `isactive`(unquoted) 는 존재하지 않는 컬럼 → 조회 항상 실패 → env fallback 만 동작했음.
 *  - 이 조회는 try/catch 로 감싸 실패 시 env fallback 하므로 안전(운영 ai_settings 는 현재 0 rows).
 *  - Surface DB lookup failures via logger.warn instead of swallowing silently.
 *  - (drift 주의) migration 1706000000000 은 "isActive", AiSettings entity 는 isactive/apikey 로
 *    운영 스키마와 불일치. entity/migration 정합화는 별도 WO. 본 util 은 운영 실측 컬럼에 맞춘다.
 */
export async function resolveAiApiKey(
  dataSource: DataSource,
  provider: string,
): Promise<string> {
  // 1. ai_settings table (운영 실측 컬럼: "apiKey" / "isEnabled")
  try {
    if (dataSource.isInitialized) {
      const rows = await dataSource.query(
        `SELECT "apiKey" FROM ai_settings WHERE provider = $1 AND "isEnabled" = true LIMIT 1`,
        [provider],
      );
      if (rows[0]?.apiKey) {
        return rows[0].apiKey as string;
      }
    }
  } catch (err: any) {
    logger.warn('ai_settings lookup failed; falling back to env var', {
      provider,
      error: err?.message,
    });
  }

  // 2. Environment variable
  const envVarName = PROVIDER_ENV_KEYS[provider];
  if (envVarName) {
    const value = process.env[envVarName];
    if (value) return value;
  }

  return '';
}
