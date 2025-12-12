/**
 * Health Extension Backend
 * @package @o4o/health-extension
 */

export {
  healthValidationHooks,
  beforeOfferCreate,
  afterOfferCreate,
  beforeListingCreate,
  afterListingCreate,
  beforeOrderCreate,
  afterOrderCreate,
  type HookContext,
  type HookResult,
} from './hooks/health-validation.hook.js';
