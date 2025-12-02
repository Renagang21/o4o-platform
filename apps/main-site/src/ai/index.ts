/**
 * AI Generator Entry Point
 * Exports all public APIs for AI-based view generation
 */

export {
  generateFromPrompt,
  generateFromPrompts,
  previewGeneration,
  getAIStats,
} from './aiGenerator';

export { analyzeIntent, analyzeIntents } from './intent/analyzeIntent';

export { AI_CONFIG, isAIConfigured, getCurrentProvider } from './config';

export type {
  NaturalLanguagePrompt,
  AIIntent,
  AIGenerationOptions,
  AIGenerationResult,
  AntigravityNode,
  AntigravityTree,
  LLMRequest,
  LLMResponse,
} from './types';
