// @o4o/types - Shared TypeScript Types
// Export all type definitions here

export * from './api';
export * from './auth';
export * from './common';
export * from './database';
export * from './performance';
export * from './analytics';
export * from './graceful-degradation';
export * from './post';
export * from './menu';
export * from './custom-post-type';
export * from './advanced-custom-fields';
export * from './media';
export * from './template';
export * from './widget';
export * from './form-builder';
export * from './zone';
export * from './access-control';

// Export ecommerce types
export * from './ecommerce';

// Export pricing types
export * from './pricing';

// Export crowdfunding types
export * from './crowdfunding';

// Export partner types (replacing old affiliate module)
export * from './partner';

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
} from './partner';

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
} from './vendor-management';

// Re-export with different names to avoid conflicts
export type { PriceCalculation as VendorPriceCalculation } from './vendor-management';
export type { SupplierStats as VendorSupplierStats } from './vendor-management';