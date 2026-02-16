/**
 * AI Provider Interface
 *
 * All LLM backends (Gemini, OpenAI, future local) implement this.
 * The orchestrator selects providers via configuration.
 */

export type { AIProvider, AIProviderConfig, AIProviderResponse } from '../types.js';
