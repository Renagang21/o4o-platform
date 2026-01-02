import { promptRegistry } from '../services/PromptRegistry';
import { glucoseviewPrompts } from './glucoseview';

/**
 * 모든 서비스 프롬프트 등록
 */
export function registerAllPrompts(): void {
  // GlucoseView 프롬프트 등록
  promptRegistry.registerPrompts(glucoseviewPrompts);

  // 추후 다른 서비스 프롬프트 추가
  // promptRegistry.registerPrompts(yaksaPrompts);
  // promptRegistry.registerPrompts(cosmeticsPrompts);
}

export { glucoseviewPrompts };
