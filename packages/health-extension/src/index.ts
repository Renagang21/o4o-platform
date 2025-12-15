/**
 * Health Extension
 * 건강기능식품/건강제품 산업군 확장 앱
 * @package @o4o/health-extension
 */

export { healthExtensionManifest, manifest } from './manifest.js';

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
  type HealthProductBase,
  isHealthProduct,
  validateHealthMetadata,
  isExpirationNear,
  isExpired,
} from './types.js';

export * from './backend/index.js';

// Lifecycle
export * from './lifecycle/index.js';
