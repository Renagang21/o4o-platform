/**
 * AI Generator Configuration
 * Configure LLM providers and settings
 */

export const AI_CONFIG = {
  // Default provider (can be overridden by environment variable)
  defaultProvider: (process.env.VITE_AI_PROVIDER as 'openai' | 'anthropic' | 'google' | 'local') || 'local',

  // Provider settings
  providers: {
    openai: {
      apiKey: process.env.VITE_OPENAI_API_KEY || '',
      model: process.env.VITE_OPENAI_MODEL || 'gpt-4',
      baseURL: process.env.VITE_OPENAI_BASE_URL || 'https://api.openai.com/v1',
    },
    anthropic: {
      apiKey: process.env.VITE_ANTHROPIC_API_KEY || '',
      model: process.env.VITE_ANTHROPIC_MODEL || 'claude-3-sonnet-20240229',
      baseURL: process.env.VITE_ANTHROPIC_BASE_URL || 'https://api.anthropic.com/v1',
    },
    google: {
      apiKey: process.env.VITE_GOOGLE_API_KEY || '',
      model: process.env.VITE_GOOGLE_MODEL || 'gemini-pro',
      baseURL: process.env.VITE_GOOGLE_BASE_URL || 'https://generativelanguage.googleapis.com/v1',
    },
    local: {
      // Local rule-based fallback (no API key needed)
      enabled: true,
    },
  },

  // Generation settings
  generation: {
    temperature: 0.7,
    maxTokens: 2000,
    maxRetries: 3,
    fallbackToRules: true, // Use rule-based generator if LLM fails
  },

  // System prompts
  prompts: {
    intent: `You are a UI/UX expert assistant that analyzes user requests and generates structured view intents.

Given a user request, analyze it and return a JSON object with the following structure:
{
  "viewId": "kebab-case-view-id",
  "category": "commerce" | "dashboard" | "auth" | "admin" | "other",
  "action": "list" | "detail" | "create" | "edit" | "view" | "custom",
  "components": ["component1", "component2"],
  "layout": "DefaultLayout" | "ShopLayout" | "DashboardLayout" | "AuthLayout",
  "confidence": 0.0 to 1.0,
  "suggestions": ["optional suggestion"],
  "reasoning": "why you chose these settings"
}

Available components:
- productList, productDetail, productCard
- cart, checkout, orderList, orderDetail
- sellerDashboard, login, signup, resetPassword
- adminSellerList, adminProductList, adminOrderList

Rules:
1. viewId should be descriptive and kebab-case
2. category determines the layout
3. components should match the intent
4. confidence should reflect your certainty
5. Include reasoning for transparency`,
  },
} as const;

/**
 * Check if AI provider is configured
 */
export function isAIConfigured(provider?: string): boolean {
  const currentProvider = provider || AI_CONFIG.defaultProvider;

  if (currentProvider === 'local') {
    return true;
  }

  const config = AI_CONFIG.providers[currentProvider as keyof typeof AI_CONFIG.providers];
  return !!(config && 'apiKey' in config && config.apiKey);
}

/**
 * Get current AI provider
 */
export function getCurrentProvider(): string {
  if (isAIConfigured(AI_CONFIG.defaultProvider)) {
    return AI_CONFIG.defaultProvider;
  }

  // Check each provider
  for (const [name, config] of Object.entries(AI_CONFIG.providers)) {
    if ('apiKey' in config && config.apiKey) {
      return name;
    }
  }

  return 'local'; // Fallback to rule-based
}
