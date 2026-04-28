/**
 * Neture API - Barrel export
 *
 * 기존 import { ... } from '../../lib/api' 경로 호환 유지
 */

// Client utilities
export { API_BASE_URL, api } from './client.js';

// Core Neture API
export {
  netureApi,
  type ProductPurpose,
  type ContactVisibility,
  type TrustSignals,
  type ContactHint,
  type ContactHints,
  type Supplier,
  type SupplierDetail,
  type PartnershipRequest,
  type PartnershipRequestDetail,
} from './neture.js';

// Partner APIs
export {
  recruitingApi,
  partnerDashboardApi,
  partnerRecruitmentApi,
  partnerCommissionApi,
  type RecruitingProduct,
  type PartnerDashboardItem,
  type BrowsableContent,
  type LinkedContent,
  type PartnerRecruitment,
  type CommissionStatus,
  type Commission,
  type CommissionOrderItem,
  type CommissionDetail,
  type PartnerCommissionKpi,
  type CommissionsResponse,
  partnerAffiliateApi,
  partnerSettlementApi,
  type PoolProduct,
  type ReferralLink,
  type PartnerSettlementSummary,
  type PartnerSettlementDetail,
  type PartnerSettlementDetailItem,
} from './partner.js';

// Content APIs
export {
  cmsApi,
  contentAssetApi,
  type CmsContent,
  type DashboardAsset,
  type DashboardSortType,
  type DashboardKpi,
} from './content.js';

// Supplier API
export {
  supplierApi,
  supplierProfileApi,
  supplierCommissionApi,
  type SupplierProductPurpose,
  type DistributionType,
  type SupplierLibraryItem,
  type SupplierProduct,
  type ServiceSummary,
  type OrderSummaryResponse,
  type OrderSummary,
  type SupplierProfile,
  type SupplierOrderCondition,
  type ProfileCompleteness,
  type SupplierPartnerCommission,
  supplierCopilotApi,
  type SupplierKpiSummary,
  type ProductPerformanceItem,
  type DistributionItem,
  type TrendingProductItem,
  type SupplierAiInsight,
  type SpotPricePolicy,
  supplierKpaEventOfferApi,
  type SupplierEventOfferStats,
  // WO-O4O-EVENT-OFFER-SUPPLIER-UI-V1
  type ProposableOffer,
  type ProposeOfferResult,
  type SupplierEventOfferErrorCode,
} from './supplier.js';

// Seller API
export {
  sellerApi,
  type SellerApprovedProduct,
} from './seller.js';

// Admin APIs
export {
  adminOperatorApi,
  adminSupplierApi,
  adminSettlementApi,
  adminCommissionApi,
  adminProductApi,
  adminMasterApi,
  adminServiceApprovalApi,
  adminRegistrationApi,
  operatorRegistrationApi,
  type RegistrationRecord,
  adminPartnerSettlementApi,
  type NetureOperatorInfo,
  type AdminSupplier,
  type AdminProduct,
  type AdminMaster,
  type ServiceApproval,
  type AdminCommissionKpi,
  type PartnerSettlement,
  type PartnerSettlementItem,
  type PartnerSettlementStatus,
  type PartnerSettlementsResponse,
} from './admin.js';

// Product API
export {
  productApi,
  type CategoryTreeItem,
  type BrandItem,
  type ProductImage,
  type MasterSearchResult,
  type MasterSearchResponse,
} from './product.js';

// Catalog Import API
export { catalogImportApi } from './catalog.js';

// Supplier CSV Import API (WO-NETURE-CSV-IMPORT-UI-V1)
export { csvImportApi, type CsvBatch, type CsvBatchDetail, type CsvBatchRow, type CsvApplyResult } from './csvImport.js';

// Dashboard API
export {
  dashboardApi,
  type SupplierDashboardSummary,
  type SupplierDashboardStats,
  type ServiceStat,
  type RecentActivity,
  type OperatorDashboardData,
  type PartnerDashboardSummary,
  type PartnerDashboardStats,
  type ConnectedService,
  type Notification,
} from './dashboard.js';

// Operator API
export {
  operatorSupplyApi,
  operatorAllOffersApi,
  type OperatorSupplyProduct,
  type AllRegisteredOffer,
  type AllOffersKpi,
  type AllOffersResponse,
} from './operator.js';

// Operator Dashboard API (WO-O4O-OPERATOR-API-ARCHITECTURE-UNIFICATION-V1)
export { fetchOperatorDashboard } from './operatorDashboard.js';

// Contact API
export {
  contactApi,
  type ContactFormData,
  type ContactSubmitResult,
} from './contact.js';

// WO-NETURE-CURATION-PHASE3-FULL-REMOVAL-V1: operatorCurationApi 제거

// Store API + Order/Fulfillment types
export {
  storeApi,
  getInventoryStatus,
  getTrackingUrl,
  CARRIERS,
  SHIPMENT_STATUS_LABELS,
  SETTLEMENT_STATUS_LABELS,
  type StoreOrderShipping,
  type CreateStoreOrderRequest,
  type StoreOrderItem,
  type StoreOrder,
  type StoreOrdersResponse,
  type SupplierOrderSummary,
  type SupplierOrdersResponse,
  type SupplierOrderKpi,
  // IR-NETURE-B2B-DIRECT-SHIPPING-ORDER-FLOW-AUDIT-V1 Phase 3
  type NetureOrderType,
  type NetureCustomerInfo,
  type InventoryItem,
  type InventoryStatus,
  type Shipment,
  type SettlementStatus,
  type Settlement,
  type SettlementOrder,
  type SettlementDetail,
  type SettlementKpi,
  type SettlementsResponse,
  type AdminSettlementKpi,
  type StoreProductSearchResult,
  type StoreProductSearchResponse,
  type StoreOfferItem,
  type StoreListingItem,
  type StoreListingsResponse,
} from './store.js';

// Media Library (WO-O4O-COMMON-MEDIA-PICKER-UPLOADER-V1)
export { mediaApi, type MediaAssetItem } from './media.js';

// Neture Event Offer API (WO-O4O-EVENT-OFFER-NETURE-ADOPTION-V1)
export { netureEventOfferApi } from './eventOffer.js';
