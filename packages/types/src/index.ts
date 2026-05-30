// @o4o/types - Shared TypeScript Types
// Export all type definitions here

export * from './api.js';

// Legacy auth exports (selectively, for backward compatibility)
// Note: User, Permission are now in auth/index.ts (SSOT)
export type { UserRole, AuthToken, SessionStatus } from './auth.js';
export { COMMON_PERMISSIONS } from './auth.js';

// New SSOT Auth module (P0 RBAC) - Primary source for auth types
export * from './auth/index.js';
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

// Export listing display types (Phase 1)
export * from './listing-display.js';

// Export service branding (WO-KPA-BRANDING-UNIFICATION-V1)
export * from './service-branding.js';

// Export operator policy types (WO-KPA-OPERATOR-SCOPE-UNIFICATION-V1)
export * from './operator-policy.js';

// Export operator capability types (WO-O4O-OPERATOR-CAPABILITY-LAYER-V1)
export * from './operator-capability.js';

// Export operator route constants (WO-O4O-OPERATOR-ROUTE-REFINEMENT-V1)
export * from './operator-routes.js';

// Export operator action types (WO-O4O-OPERATOR-ACTION-STANDARDIZATION-V1)
export * from './operator-action.js';

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

// Export forum API response types (Phase 19-B)
export * from './forum.js';

// Export unified content meta language (WO-CONTENT-META-TYPE-CONTRACT-V1)
export * from './content-meta.js';

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

// Export storefront config types (WO-O4O-STOREFRONT-STABILIZATION-V1)
export * from './storefront-config.js';

// Export hub content types (WO-O4O-HUB-CONTENT-QUERY-SERVICE-PHASE1-V2)
export * from './hub-content.js';

// Export store production router state types (WO-O4O-STORE-PRODUCTION-TYPES-COMMONIZATION-PHASE2-F-V1)
// canonical 출처 — KPA / GlycoPharm / K-Cosmetics 가 re-export 하여 사용
export * from './production.js';

// Export store production template types (WO-O4O-PRODUCTION-TEMPLATE-REGISTRY-CROSSSERVICE-PHASE2-J-V1)
// canonical 출처 — KPA / GlycoPharm / K-Cosmetics 서비스별 template registry 타입 기반
export * from './production-template.js';

// Export business registration canonical types (WO-O4O-BUSINESS-INFO-CANONICAL-TYPE-PACKAGE-V1)
// canonical 출처 — 4 service 사업자성 회원 (약국 경영자 / 매장 경영자 / 공급자 / 파트너)
// 의 공통 사업자 등록 정보 type. 계좌 정보 제외 / 세금계산서 정보 별도.
// 선행: IR-O4O-BUSINESS-REGISTRATION-FIELDS-CROSSSERVICE-AUDIT-V1
export * from './business-registration.js';