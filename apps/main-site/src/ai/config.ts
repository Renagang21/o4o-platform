/**
 * AI Generator Configuration
 * Configure LLM providers and settings
 *
 * All LLM API keys are server-side only.
 * Frontend always uses rule-based local fallback.
 */

export const AI_CONFIG = {
  // Always use local rule-based generator (no client-side API keys)
  defaultProvider: 'local' as const,

  // Provider settings
  providers: {
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
export function isAIConfigured(_provider?: string): boolean {
  return AI_CONFIG.defaultProvider === 'local';
}

/**
 * Get current AI provider
 */
export function getCurrentProvider(): string {
  return 'local';
}
