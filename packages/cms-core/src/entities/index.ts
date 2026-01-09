// Template system
export * from './CmsTemplate.entity.js';
export * from './CmsTemplatePart.entity.js';
export * from './CmsView.entity.js';

// Content system (WO-P2-IMPLEMENT-CONTENT)
export * from './CmsContent.entity.js';
export * from './CmsContentSlot.entity.js';

// Custom Post Types
export * from './CmsCptType.entity.js';
export * from './CmsCptField.entity.js';

// Advanced Custom Fields
export * from './CmsAcfFieldGroup.entity.js';
export * from './CmsAcfField.entity.js';
export * from './CmsAcfValue.entity.js';

// Settings
export * from './CmsSetting.entity.js';

// Menu system
export * from './CmsMenu.entity.js';
export * from './CmsMenuItem.entity.js';
export * from './CmsMenuLocation.entity.js';

// Media library
export * from './CmsMedia.entity.js';
export * from './CmsMediaFile.entity.js';
export * from './CmsMediaFolder.entity.js';
export * from './CmsMediaTag.entity.js';

// All entities for TypeORM registration
export const CmsEntities = [
  // Lazy import to avoid circular dependencies
] as const;
