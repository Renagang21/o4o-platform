/**
 * Health Extension
 *
 * 건강기능식품/건강제품 산업군 확장 앱
 * ProductType.HEALTH 기반 산업 확장
 *
 * @package @o4o/health-extension
 */

// Manifest
export { healthExtensionManifest, manifest } from './manifest.js';

// Types
export {
  type HealthMetadata,
  type NutritionInfo,
  type HealthFilters,
  type AllergyType,
  type StorageMethod,
  type HealthCertification,
  type HealthCategory,
  type TargetGroup,
  type ProductForm,
  isHealthProduct,
  validateHealthMetadata,
  isExpirationNear,
  isExpired,
} from './types.js';

// Lifecycle
export {
  install,
  activate,
  deactivate,
  uninstall,
} from './lifecycle/index.js';

// Re-export backend
export * from './backend/index.js';

// Re-export frontend
export * from './frontend/index.js';
