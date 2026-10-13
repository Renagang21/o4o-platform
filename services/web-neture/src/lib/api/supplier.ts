import { supplierMediaApi } from './supplier/media';
import { supplierProductsApi } from './supplier/products';
import { supplierOrdersApi } from './supplier/orders';
import { supplierInventoryApi } from './supplier/inventory';
import { supplierShipmentsApi } from './supplier/shipments';
import { supplierSettlementsApi } from './supplier/settlements';
import { supplierLibraryApi } from './supplier/library';
import { supplierSpotApi } from './supplier/spot';

/** Compatible public facade; original method order and direct function references are preserved. */
export const supplierApi = {
  proxyImageObjectUrl: supplierMediaApi.proxyImageObjectUrl,
  copyImages: supplierMediaApi.copyImages,
  getProducts: supplierProductsApi.getProducts,
  getProductsPaginated: supplierProductsApi.getProductsPaginated,
  getApprovalCounts: supplierProductsApi.getApprovalCounts,
  batchUpdateProducts: supplierProductsApi.batchUpdateProducts,
  bulkDelete: supplierProductsApi.bulkDelete,
  submitForApproval: supplierProductsApi.submitForApproval,
  createOfferFromMaster: supplierProductsApi.createOfferFromMaster,
  submitProductCandidate: supplierProductsApi.submitProductCandidate,
  updateProduct: supplierProductsApi.updateProduct,
  updateDistribution: supplierProductsApi.updateDistribution,
  getServicePrices: supplierProductsApi.getServicePrices,
  setServicePrices: supplierProductsApi.setServicePrices,
  updateBusinessContent: supplierProductsApi.updateBusinessContent,
  getOrdersSummary: supplierOrdersApi.getOrdersSummary,
  getLibraryItems: supplierLibraryApi.getLibraryItems,
  getLibraryItem: supplierLibraryApi.getLibraryItem,
  createLibraryItem: supplierLibraryApi.createLibraryItem,
  updateLibraryItem: supplierLibraryApi.updateLibraryItem,
  deleteLibraryItem: supplierLibraryApi.deleteLibraryItem,
  getLibraryHandoffTargets: supplierLibraryApi.getLibraryHandoffTargets,
  handoffLibraryItem: supplierLibraryApi.handoffLibraryItem,
  getOrders: supplierOrdersApi.getOrders,
  getUnifiedOrders: supplierOrdersApi.getUnifiedOrders,
  getOrderById: supplierOrdersApi.getOrderById,
  updateOrderStatus: supplierOrdersApi.updateOrderStatus,
  getOrderKpi: supplierOrdersApi.getOrderKpi,
  getInventory: supplierInventoryApi.getInventory,
  updateInventory: supplierInventoryApi.updateInventory,
  createShipment: supplierShipmentsApi.createShipment,
  getShipment: supplierShipmentsApi.getShipment,
  updateShipmentStatus: supplierShipmentsApi.updateShipmentStatus,
  getSettlements: supplierSettlementsApi.getSettlements,
  getSettlementDetail: supplierSettlementsApi.getSettlementDetail,
  getSettlementKpi: supplierSettlementsApi.getSettlementKpi,
  createSpotPolicy: supplierSpotApi.createSpotPolicy,
  listSpotPolicies: supplierSpotApi.listSpotPolicies,
  changeSpotPolicyStatus: supplierSpotApi.changeSpotPolicyStatus,
};
export {
  SUPPLIER_ORDERS_LOAD_FAILED,
  SUPPLIER_INVENTORY_LOAD_FAILED,
  SUPPLIER_SETTLEMENTS_LOAD_FAILED,
  SUPPLIER_APPROVAL_COUNTS_LOAD_FAILED,
  SUPPLIER_RECRUITMENTS_LOAD_FAILED,
  SUPPLIER_ONBOARDING_LOAD_FAILED,
  SUPPLIER_REGULATED_CATEGORIES_LOAD_FAILED,
  SUPPLIER_LIBRARY_ITEMS_LOAD_FAILED,
  SUPPLIER_LIBRARY_ITEM_LOAD_FAILED,
  SUPPLIER_LIBRARY_ITEM_NOT_FOUND,
  SUPPLIER_SPOT_POLICIES_LOAD_FAILED,
  SUPPLIER_SPOT_POLICIES_FORBIDDEN,
  SUPPLIER_SHIPMENT_LOAD_FAILED,
  SUPPLIER_SHIPMENT_ORDER_NOT_FOUND,
  SUPPLIER_ORDER_CONDITION_LOAD_FAILED,
  SUPPLIER_ORDER_CONDITION_NOT_FOUND,
  SUPPLIER_PROFILE_LOAD_FAILED,
  SUPPLIER_PROFILE_COMPLETENESS_LOAD_FAILED,
  SUPPLIER_RECRUITMENT_NOT_FOUND,
  SUPPLIER_RECRUITMENT_APPLICATIONS_LOAD_FAILED,
  SUPPLIER_PRODUCTS_LOAD_FAILED,
} from './supplier/errors';
export type * from './supplier/product.types';
export type * from './supplier/business.types';
export type * from './supplier/orders.types';
export type * from './supplier/library.types';
export type * from './supplier/recruitment.types';
export type * from './supplier/event-offer.types';
export { supplierCopilotApi } from './supplier/copilot';
export { supplierProfileApi } from './supplier/profile';
export { supplierOnboardingApi } from './supplier/onboarding';
export {
  supplierRegulatedCategoryApi,
  REGULATED_CATEGORY_LABELS,
  REGULATED_CATEGORY_ORDER,
  REGULATED_CATEGORY_STATUS_LABELS,
} from './supplier/categories';
export { supplierRecruitmentApi } from './supplier/recruitment';
export { supplierKpaEventOfferApi } from './supplier/event-offer';
export { submitBulkCandidates } from './supplier/bulk';
