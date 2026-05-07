/**
 * AI API Key Resolver — WO-AI-KEY-UTIL-EXTRACT-V1
 *
 * Single source of truth for AI provider API key resolution.
 * Consolidates 5 independent implementations across the server.
 *
 * Priority:
 *   1. ai_settings table (provider = ?, "isActive" = true)
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
 * WO-O4O-AI-GEMINI-RESILIENCE-FIX-V1:
 *  - "apiKey" column: created with double-quotes in migration → must remain quoted.
 *  - isactive column: created unquoted (lowercase) → must NOT be quoted.
 *    Confirmed via production logs: `column "isActive" does not exist` when quoted.
 *    store-ai.controller.ts uses `isactive` (unquoted) successfully as reference.
 *  - Surface DB lookup failures via logger.warn instead of swallowing silently.
 */
export async function resolveAiApiKey(
  dataSource: DataSource,
  provider: string,
): Promise<string> {
  // 1. ai_settings table
  try {
    if (dataSource.isInitialized) {
      const rows = await dataSource.query(
        `SELECT "apiKey" FROM ai_settings WHERE provider = $1 AND isactive = true LIMIT 1`,
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
