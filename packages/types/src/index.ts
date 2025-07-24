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

// Export ecommerce types
export * from './ecommerce';

// Export pricing types
export * from './pricing';

// Export crowdfunding types
export * from './crowdfunding';

// Export affiliate types
export * from './affiliate';

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