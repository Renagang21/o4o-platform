/** 상품 승인 탭 카운트 — 필드명은 backend 응답 그대로다(unrequested 등). */
export interface SupplierApprovalCounts {
  total: number;
  unrequested: number;
  pending: number;
  approved: number;
  rejected: number;
}

// ==================== Supplier Types ====================

export type SupplierProductPurpose = 'CATALOG' | 'APPLICATION' | 'ACTIVE_SALES';

export type DistributionType = 'PUBLIC' | 'SERVICE' | 'PRIVATE';

export interface SupplierProduct {
  id: string;
  name: string;
  category: string;
  description: string;
  purpose: SupplierProductPurpose;
  isActive: boolean;
  acceptsApplications: boolean;
  isPublic: boolean;
  // WO-KPA-RECOMMENDED-TAB-REPLACE-CURATION-WITH-SUPPLIER-HIGHLIGHT-V1
  isFeatured?: boolean;
  distributionType: DistributionType;
  allowedSellerIds: string[] | null;
  pendingRequestCount: number;
  activeServiceCount: number;
  createdAt: string;
  updatedAt: string;
  masterId: string;
  masterName: string;
  barcode: string;
  brandName: string | null;
  categoryName: string | null;
  specification: string | null;
  primaryImageUrl: string | null;
  approvalStatus: string;
  priceGeneral: number;
  priceGold: number | null;
  /** @deprecated WO-NETURE-SPOT-PRICE-POLICY-FOUNDATION-V1: 별도 정책으로 이동 */
  pricePlatinum?: number | null;
  consumerReferencePrice: number | null;
  // WO-NETURE-PRODUCT-REGISTRATION-REFACTOR-AND-AI-TAGGING-V1
  tags?: string[];
  serviceKeys?: string[];
  // WO-NETURE-PRODUCT-APPROVAL-FLOW-V1
  serviceApprovals?: Array<{ serviceKey: string; status: string; reason?: string | null }>;
  // WO-NETURE-SUPPLIER-CONTENT-EDIT-UX-V1
  consumerShortDescription?: string | null;
  consumerDetailDescription?: string | null;
  // WO-NETURE-B2B-CONTENT-MANAGEMENT-V1
  businessShortDescription?: string | null;
  businessDetailDescription?: string | null;
  // WO-NETURE-SUPPLIER-PRODUCT-COMPLETENESS-MANAGEMENT-V1
  completenessScore?: number;
  completenessStatus?: 'DRAFT' | 'INCOMPLETE' | 'READY' | 'APPROVED';
  // WO-NETURE-SUPPLIER-EDIT-UI-CONSISTENCY-FIX-V1
  stockQuantity?: number;
  regulatoryType?: string;
  // WO-O4O-NETURE-SUPPLIER-PRODUCT-LIST-DRUGCATEGORY-EXPOSURE-V1: Product Core drug_category 노출 (additive)
  drugCategory?: string | null;
  regulatoryName?: string;
  mfdsPermitNumber?: string | null;
  manufacturerName?: string | null;
  // WO-NETURE-PRODUCT-FIELD-GAP-FIX-V1
  originCountry?: string | null;
  categoryId?: string | null;
  brandId?: string | null;
  // WO-KPA-SOCIETY-SECOND-REVIEW-BRIDGE-FOUNDATION-V1
  kpaReviewStatus?: string | null;
  kpaReviewReason?: string | null;
}

export interface ServiceSummary {
  serviceId: string;
  serviceName: string;
  summary: {
    approvedSellerCount: number;
    pendingRequestCount: number;
    lastApprovedAt: string | null;
  };
  navigation: {
    serviceUrl: string | null;
    ordersUrl: string | null;
    supportEmail: string | null;
  };
  features: string[];
  recentActivity: Array<{
    eventType: 'approved' | 'rejected' | 'created';
    sellerName: string;
    productName: string;
    createdAt: string;
  }>;
  notice: string;
}

/** WO-NETURE-SPOT-PRICE-POLICY-FOUNDATION-V1 */
export interface SpotPricePolicy {
  id: string;
  offerId: string;
  supplierId: string;
  policyName: string;
  spotPrice: number;
  status: 'DRAFT' | 'ACTIVE' | 'CANCELLED';
  startAt: string;
  endAt: string;
  createdAt: string;
  updatedAt: string;
}

// (은퇴) Supplier Partner Commission — WO-O4O-LEGACY-PARTNER-RUNTIME-RETIREMENT-AND-SELLER-RECRUITMENT-EXTRACTION-V1

// ==================== Supplier Copilot Types (WO-O4O-SUPPLIER-COPILOT-DASHBOARD-V1) ====================

export interface SupplierKpiSummary {
  registeredProducts: number;
  activeProducts: number;
  storeListings: number;
  recentOrders: number;
}

export interface ProductPerformanceItem {
  productId: string;
  productName: string;
  orders: number;
  revenue: number;
  qrScans: number;
}

export interface DistributionItem {
  productId: string;
  productName: string;
  storeCount: number;
  newStores: number;
}

export interface TrendingProductItem {
  productName: string;
  currentOrders: number;
  previousOrders: number;
  growthRate: number;
}

// ==================== Import Assistant: 자사 관리자 상품 이미지 복사 ====================
// WO-O4O-NETURE-SUPPLIER-OWN-ADMIN-PRODUCT-IMPORT-V1

/** copy-images 결과 */
export interface CopiedImageResult {
  originalUrl: string;
  url: string | null;
  ok: boolean;
  reason?: string;
}

export interface CopyImagesResult {
  copied: number;
  total: number;
  results: CopiedImageResult[];
}

/* ──────────────────────────────────────────────────────────────────────────
 * WO-O4O-NETURE-SUPPLIER-BULK-UPLOAD-SAVE-V3
 * 검증 통과 bulk row → ProductCandidate(안전 후보) 제출. ProductMaster 직접 생성 아님.
 * ────────────────────────────────────────────────────────────────────────── */

export interface BulkCandidateRowInput {
  rowNumber: number;
  fields: Record<string, string>;
  raw: Record<string, string>;
}

export interface BulkCandidateResultRow {
  rowNumber: number;
  status: 'created' | 'duplicate' | 'failed' | 'skipped' | 'review_required';
  candidateId?: string;
  message?: string;
}

export interface BulkCandidateSubmitResult {
  total: number;
  created: number;
  duplicate: number;
  failed: number;
  results: BulkCandidateResultRow[];
}
