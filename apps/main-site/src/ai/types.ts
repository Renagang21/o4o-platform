/**
 * AI Generator Types
 * Types for AI-based view generation
 */

import { AnalyzedIntent, ViewSchema } from '../generator/types';

/**
 * Natural language prompt for AI generation
 */
export interface NaturalLanguagePrompt {
  text: string;
  context?: {
    existingViews?: string[];
    userRole?: string;
    preferredLayout?: string;
  };
}

/**
 * AI-analyzed intent (extends base AnalyzedIntent)
 */
export interface AIIntent extends AnalyzedIntent {
  confidence: number;
  suggestions?: string[];
  reasoning?: string;
}

/**
 * Antigravity UI tree structure
 */
export interface AntigravityNode {
  id: string;
  type: string;
  props?: Record<string, any>;
  children?: AntigravityNode[];
  style?: Record<string, any>;
}

export interface AntigravityTree {
  nodes: AntigravityNode[];
  metadata?: {
    version?: string;
    createdAt?: string;
    author?: string;
  };
}

/**
 * LLM API request/response
 */
export interface LLMRequest {
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
  schema?: any;
  temperature?: number;
  maxTokens?: number;
}

export interface LLMResponse {
  intent: AIIntent;
  raw?: string;
}

/**
 * AI generation options
 */
export interface AIGenerationOptions {
  provider?: 'openai' | 'anthropic' | 'google' | 'local';
  model?: string;
  temperature?: number;
  maxRetries?: number;
  fallbackToRules?: boolean;
}

/**
 * AI generation result
 */
export interface AIGenerationResult {
  success: boolean;
  view?: ViewSchema;
  intent?: AIIntent;
  filePath?: string;
  error?: string;
  usedFallback?: boolean;
}
