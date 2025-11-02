/**
 * Astra Customizer Types
 * 모든 커스터마이저 타입을 중앙에서 export
 */

// Common types
export * from './common/base-types';
export * from './common/api-types';
export * from './common/component-types';

// Domain-specific types
export * from './header/header-types';
export * from './footer/footer-types';
export * from './blog/blog-types';
export * from './global/global-types';
export * from './layout/layout-types';

// Re-export remaining types from original file for backward compatibility
export type {
  AstraCustomizerSettings,
  CustomizerSectionProps,
  CustomizerControlProps,
  CustomizerPreset,
  CustomizerMessage,
  CustomizerEventHandlers,
  SettingSection,
  SettingChangeAction
} from './customizer-types';
