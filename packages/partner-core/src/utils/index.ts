/**
 * Partner Core Utilities
 *
 * @package @o4o/partner-core
 */

export {
  PARTNER_ALLOWED_PRODUCT_TYPES,
  PARTNER_EXCLUDED_PRODUCT_TYPES,
  isPartnerEligibleProductType,
  isPartnerExcludedProductType,
  isPharmaceuticalProductType,
  validateProductTypeForPartner,
  filterPartnerEligibleProducts,
  filterPartnerExcludedProducts,
  getProductTypeStats,
  getAllowedProductTypes,
  getExcludedProductTypes,
  type PartnerAllowedProductType,
  type PartnerExcludedProductType,
  type ProductType,
  type ProductTypeValidationResult,
  type ProductTypeStats,
} from './product-type-filter.js';
