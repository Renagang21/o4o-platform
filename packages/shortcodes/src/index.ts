// 타입 export
export * from './types.js';

// 파서 export
export {
  DefaultShortcodeParser,
  defaultParser,
  hasShortcode,
  stripShortcodes,
  extractShortcodes,
  parseShortcodeAttributes
} from './parser.js';

// 레지스트리 export
export {
  DefaultShortcodeRegistry,
  globalRegistry,
  registerShortcode,
  unregisterShortcode,
  getShortcode,
  hasShortcode as hasShortcodeRegistered
} from './registry.js';

// 렌더러 export
export { DefaultShortcodeRenderer, useShortcodes } from './renderer.js';

// 편의를 위한 기본 인스턴스들
import { defaultParser } from './parser.js';
import { globalRegistry } from './registry.js';
import { DefaultShortcodeRenderer } from './renderer.js';

export const defaultRenderer = new DefaultShortcodeRenderer(defaultParser, globalRegistry);

/**
 * 간편하게 숏코드를 렌더링하는 함수
 */
export const renderShortcodes = (content: string, context?: any) => {
  return defaultRenderer.render(content, context);
};

// Provider export
export { ShortcodeProvider, useShortcodeContext, ShortcodeContent } from './provider.js';

// Renderer Component export
export {
  ShortcodeRenderer,
  DefaultLoadingComponent,
  DefaultErrorComponent,
  DefaultUnknownShortcodeComponent
} from './components/ShortcodeRenderer.js';

// Preset shortcode
export { PresetShortcode } from './components/PresetShortcode.js';
export {
  registerPresetShortcode,
  presetShortcodeDefinition
} from './preset/index.js';

// Dropshipping shortcodes
export { registerDropshippingShortcodes } from './dropshipping/index.js';
export { SellerDashboard, SupplierDashboard, AffiliateDashboard } from './dropshipping/index.js';

// Auth shortcodes
export { registerAuthShortcodes } from './auth/index.js';
export { SocialLogin } from './auth/index.js';

// Dynamic shortcodes
export {
  CPTListShortcode,
  cptListShortcodeDefinition,
  CPTFieldShortcode,
  cptFieldShortcodeDefinition,
  ACFFieldShortcode,
  acfFieldShortcodeDefinition,
  MetaFieldShortcode,
  metaFieldShortcodeDefinition,
  registerDynamicShortcodes,
  getDynamicShortcodeDefinitions,
  dynamicShortcodeTemplates
} from './dynamic/index.js';