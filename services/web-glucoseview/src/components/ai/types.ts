/**
 * AI Chat Types for GlucoseView
 */

export interface PromptDefinition {
  id: string;
  name: string;
  description: string;
  buttonLabel: string;
  suggestedQuestion: string;
  systemPrompt: string;
  userPromptTemplate: string;
  icon?: string;
  order?: number;
  isDefault?: boolean;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  promptId?: string;
  isLoading?: boolean;
}

export interface PromptContext {
  userName?: string;
  currentDate: string;
  additionalData?: Record<string, unknown>;
}
