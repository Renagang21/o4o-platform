// Types
export * from './types';

// Services
export { promptRegistry } from './services/PromptRegistry';
export { default as PromptRegistry } from './services/PromptRegistry';
export { aiService, AIService } from './services/AIService';

// Prompts
export { registerAllPrompts, glucoseviewPrompts } from './prompts';

// Components (React)
export { AIChatWidget, AIChatButton } from './components';

// 초기화 함수
import { registerAllPrompts } from './prompts';

/**
 * AI Common Core 초기화
 * 앱 시작 시 한 번 호출
 */
export function initializeAICore(): void {
  registerAllPrompts();
  console.log('[AI Common Core] Initialized');
}
