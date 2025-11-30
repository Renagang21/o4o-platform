// @o4o/types - Shared TypeScript Types
// Export all type definitions here

export * from './api.js';
export * from './auth.js';
export * from './common.js';
export * from './database.js';
export * from './performance.js';
export * from './analytics.js';
export * from './graceful-degradation.js';
export * from './post.js';
export * from './menu.js';
export * from './custom-post-type.js';
export * from './advanced-custom-fields.js';
export * from './media.js';
export * from './template.js';
export * from './widget.js';
export * from './form-builder.js';
export * from './zone.js';
export * from './access-control.js';

// Export preset types
export * from './preset.js';

// Export ecommerce types
export * from './ecommerce.js';

// Export pricing types
export * from './pricing.js';

// Export dashboard types (P1 Phase C)
export * from './dashboard.js';

// Export partner types (replacing old affiliate module)
export * from './partner.js';

// Export app manifest types (App Market V1)
export * from './app-manifest.js';

// Export app lifecycle types
export * from './app-lifecycle.js';

// For backward compatibility, re-export partner types with affiliate names
export type {
  PartnerUser as AffiliateUser,
  PartnerCommission as AffiliateCommission,
  PartnerStats as AffiliateStats,
  CreatePartnerRequest as CreateAffiliateRequest,
  CreatePartnerResponse as CreateAffiliateResponse,
  GetPartnerStatsRequest as GetAffiliateStatsRequest,
  AdminPartnerOverview as AdminAffiliateOverview,
  UserPartnerDashboard as UserAffiliateDashboard,
  BankAccount as AffiliateBankAccount,
  ReferralRelationship as AffiliateReferralRelationship,
  ReferralClick as AffiliateReferralClick,
  CommissionPolicy as AffiliateCommissionPolicy,
  GenerateReferralLinkRequest as GenerateAffiliateLinkRequest,
  GenerateReferralLinkResponse as GenerateAffiliateLinkResponse,
  ProcessCommissionRequest as ProcessAffiliateCommissionRequest
} from './partner.js';

// Export vendor management types (excluding duplicates)
export type {
  // Types
  ProductApprovalStatus,
  VendorProduct,
  SupplierOrderSplit,
  VendorOrderItem,
  VendorOrder,
  ProfitCalculationParams,
  VendorStats,
  ProductApprovalRequest,
  ProductApprovalResponse,
  StockUpdateRequest,
  PricingPolicy,
  SettlementData,
  SupplierInfo,
  VendorInfo
} from './vendor-management.js';

// Re-export with different names to avoid conflicts
export type { PriceCalculation as VendorPriceCalculation } from './vendor-management.js';
export type { SupplierStats as VendorSupplierStats } from './vendor-management.js';