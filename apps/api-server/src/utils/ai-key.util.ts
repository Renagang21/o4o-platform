/**
 * AI API Key Resolver — WO-AI-KEY-UTIL-EXTRACT-V1
 *
 * Single source of truth for AI provider API key resolution.
 * Consolidates 5 independent implementations across the server.
 *
 * Priority:
 *   1. ai_settings table (provider = ?, isactive = true)
 *   2. process.env.{PROVIDER}_API_KEY
 *
 * Returns empty string if not found. Callers decide how to handle missing keys.
 */

import type { DataSource } from 'typeorm';

const PROVIDER_ENV_KEYS: Record<string, string> = {
  gemini: 'GEMINI_API_KEY',
  openai: 'OPENAI_API_KEY',
  claude: 'CLAUDE_API_KEY',
};

/**
 * Resolve AI API key for a given provider.
 * Returns empty string if no key is found. Caller decides how to handle.
 */
export async function resolveAiApiKey(
  dataSource: DataSource,
  provider: string,
): Promise<string> {
  // 1. ai_settings table
  try {
    if (dataSource.isInitialized) {
      const rows = await dataSource.query(
        `SELECT apikey FROM ai_settings WHERE provider = $1 AND isactive = true LIMIT 1`,
        [provider],
      );
      if (rows[0]?.apikey) {
        return rows[0].apikey as string;
      }
    }
  } catch {
    // DB read failed — fall through to env
  }

  // 2. Environment variable
  const envVarName = PROVIDER_ENV_KEYS[provider];
  if (envVarName) {
    const value = process.env[envVarName];
    if (value) return value;
  }

  return '';
}
