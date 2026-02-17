/**
 * Store Identity Module
 *
 * WO-CORE-STORE-SLUG-SYSTEM-V1
 *
 * Platform-wide store slug management system.
 * Ensures unique slugs across all services.
 */

// Entities
export {
  PlatformStoreSlug,
  type StoreSlugServiceKey,
} from './entities/index.js';

export { PlatformStoreSlugHistory } from './entities/platform-store-slug-history.entity.js';

// Service
export {
  StoreSlugService,
  type SlugAvailabilityResult,
  type ReserveSlugOptions,
  type ChangeSlugOptions,
} from './services/store-slug.service.js';

// Validation utilities
export {
  validateSlug,
  generateSlugFromName,
  normalizeSlug,
  SLUG_CONSTRAINTS,
  type SlugValidationResult,
  type SlugValidationError,
} from './utils/slug-validation.js';

// Reserved slugs
export {
  RESERVED_SLUGS,
  isReservedSlug,
  type ReservedSlug,
} from './constants/reserved-slugs.js';
