/**
 * AI Intent Analyzer
 * Analyzes natural language prompts and converts to structured intents
 */

import { analyzeInput } from '../../generator/analyzer';
import { AIIntent, NaturalLanguagePrompt, AIGenerationOptions } from '../types';
import { AI_CONFIG, isAIConfigured } from '../config';

/**
 * Analyze a natural language prompt and return structured intent
 * Uses LLM if configured, falls back to rule-based analysis
 */
export async function analyzeIntent(
  prompt: string | NaturalLanguagePrompt,
  options?: AIGenerationOptions
): Promise<AIIntent> {
  const text = typeof prompt === 'string' ? prompt : prompt.text;
  const context = typeof prompt === 'object' ? prompt.context : undefined;

  // Check if AI is configured
  const useAI = isAIConfigured(options?.provider);
  const fallback = options?.fallbackToRules ?? AI_CONFIG.generation.fallbackToRules;

  if (useAI && options?.provider !== 'local') {
    try {
      // Try LLM-based analysis
      return await analyzeLLM(text, context, options);
    } catch (error) {
      // Silently fall back to rules if LLM fails
      if (!fallback) {
        throw error;
      }
      // Only log in development
      if (process.env.NODE_ENV === 'development') {
        console.warn('🔄 Using rule-based analysis (LLM not configured)');
      }
    }
  }

  // Rule-based analysis (always available)
  return analyzeRuleBased(text, context);
}

/**
 * LLM-based intent analysis (to be implemented)
 */
async function analyzeLLM(
  _text: string,
  _context: any,
  _options?: AIGenerationOptions
): Promise<AIIntent> {
  // TODO: Implement LLM integration
  // For now, throw to use fallback
  throw new Error('LLM integration not yet implemented');
}

/**
 * Rule-based intent analysis
 * Uses the existing analyzer from Step 10
 */
function analyzeRuleBased(text: string, context?: any): AIIntent {
  // Use existing analyzer
  const baseIntent = analyzeInput(text);

  // Add AI-specific fields
  const aiIntent: AIIntent = {
    ...baseIntent,
    confidence: calculateConfidence(text, baseIntent),
    suggestions: generateSuggestions(baseIntent, context),
    reasoning: generateReasoning(text, baseIntent),
  };

  return aiIntent;
}

/**
 * Calculate confidence score for rule-based analysis
 */
function calculateConfidence(text: string, _intent: any): number {
  let confidence = 0.7; // Base confidence for rule-based

  // Increase confidence for exact matches
  const exactPatterns = [
    'product-list',
    'seller-dashboard',
    'cart',
    'checkout',
    'login',
    'signup',
  ];

  if (exactPatterns.some((pattern) => text.toLowerCase().includes(pattern))) {
    confidence += 0.2;
  }

  // Increase confidence for clear category indicators
  if (
    text.includes('dashboard') ||
    text.includes('대시보드') ||
    text.includes('admin') ||
    text.includes('관리')
  ) {
    confidence += 0.1;
  }

  return Math.min(confidence, 1.0);
}

/**
 * Generate suggestions based on intent
 */
function generateSuggestions(intent: any, context?: any): string[] {
  const suggestions: string[] = [];

  // Suggest related views
  if (intent.viewId === 'product-list') {
    suggestions.push('Consider adding product-detail view');
    suggestions.push('Cart view recommended for e-commerce flow');
  }

  if (intent.viewId === 'seller-dashboard') {
    suggestions.push('Add product-list for seller view');
    suggestions.push('Consider order-list for seller');
  }

  // Context-based suggestions
  if (context?.existingViews) {
    const existing = context.existingViews as string[];
    if (!existing.includes('cart') && intent.category === 'commerce') {
      suggestions.push('Cart view not found - recommended for commerce');
    }
  }

  return suggestions;
}

/**
 * Generate reasoning for the analysis
 */
function generateReasoning(text: string, intent: any): string {
  let reasoning = `Analyzed "${text}" as a ${intent.category} view. `;

  if (intent.category === 'commerce') {
    reasoning += 'Commerce category selected due to product/shop/cart keywords. ';
  } else if (intent.category === 'dashboard') {
    reasoning += 'Dashboard category selected due to dashboard/admin keywords. ';
  } else if (intent.category === 'auth') {
    reasoning += 'Authentication category selected due to login/signup keywords. ';
  }

  reasoning += `Assigned viewId: ${intent.viewId}`;

  return reasoning;
}

/**
 * Batch analyze multiple prompts
 */
export async function analyzeIntents(
  prompts: Array<string | NaturalLanguagePrompt>,
  options?: AIGenerationOptions
): Promise<AIIntent[]> {
  const results: AIIntent[] = [];

  for (const prompt of prompts) {
    const intent = await analyzeIntent(prompt, options);
    results.push(intent);
  }

  return results;
}
