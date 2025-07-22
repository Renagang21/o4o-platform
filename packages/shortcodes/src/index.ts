// 타입 export
export * from './types';

// 파서 export
export { DefaultShortcodeParser, defaultParser } from './parser';

// 레지스트리 export
export { 
  DefaultShortcodeRegistry, 
  globalRegistry,
  registerShortcode,
  unregisterShortcode,
  getShortcode,
  hasShortcode
} from './registry';

// 렌더러 export
export { DefaultShortcodeRenderer, useShortcodes } from './renderer';

// 편의를 위한 기본 인스턴스들
import { defaultParser } from './parser';
import { globalRegistry } from './registry';
import { DefaultShortcodeRenderer } from './renderer';

export const defaultRenderer = new DefaultShortcodeRenderer(defaultParser, globalRegistry);

/**
 * 간편하게 숏코드를 렌더링하는 함수
 */
export const renderShortcodes = (content: string, context?: any) => {
  return defaultRenderer.render(content, context);
};

// Provider export
export { ShortcodeProvider, useShortcodeContext, ShortcodeContent } from './provider';