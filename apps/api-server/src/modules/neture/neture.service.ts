/**
 * NetureService — Thin Facade
 *
 * WO-O4O-NETURE-FACADE-HOLLOWOUT-V1
 *
 * All business logic has been delegated to domain sub-services.
 * This file preserves the public API surface for all external consumers
 * (11 controllers, 2 route files, 3 external modules).
 *
 * Sub-services:
 *   - NetureSupplierService    (supplier identity, onboarding, profile)
 *   - NetureOfferService       (offer CRUD, approval, supplier products)
 *   - NetureCatalogService     (master, category, brand, image)
 *   - NetureDashboardService   (dashboard summaries & KPI)
 *   - SellerRecruitmentService (판매자 모집 — 비-Partner, WO-O4O-LEGACY-PARTNER-RUNTIME-RETIREMENT-AND-SELLER-RECRUITMENT-EXTRACTION-V1)
 */

import { AppDataSource } from '../../database/connection.js';
import { NetureCatalogService } from './services/catalog.service.js';
import type { MasterResolveResult } from './services/catalog.service.js';
import { NetureOfferService } from './services/offer.service.js';
import { OfferServicePriceService, type ServicePriceInput } from './services/offer-service-price.service.js';
import { NetureSupplierService } from './services/supplier.service.js';
import { NetureDashboardService } from './services/neture-dashboard.service.js';
// WO-O4O-LEGACY-PARTNER-RUNTIME-RETIREMENT-AND-SELLER-RECRUITMENT-EXTRACTION-V1: Partner 계약/제휴 서비스 은퇴, 판매자 모집만 분리 유지
import { SellerRecruitmentService } from './services/seller-recruitment.service.js';

import type { NetureSupplier, SupplierStatus, OfferDistributionType, OfferApprovalStatus, ContactVisibility, ProductMaster, ProductCategory, Brand, ProductImage } from './entities/index.js';
import type { RecruitmentStatus } from './entities/index.js';
import { ExposureStatus } from './entities/index.js';

export class NetureService {
  // ==================== Sub-service Lazy Getters ====================

  private _catalogService?: NetureCatalogService;
  private get catalogService(): NetureCatalogService {
    if (!this._catalogService) this._catalogService = new NetureCatalogService();
    return this._catalogService;
  }

  private _offerService?: NetureOfferService;
  private get offerService(): NetureOfferService {
    if (!this._offerService) this._offerService = new NetureOfferService(this.catalogService);
    return this._offerService;
  }

  private _supplierService?: NetureSupplierService;
  private get supplierService(): NetureSupplierService {
    if (!this._supplierService) this._supplierService = new NetureSupplierService();
    return this._supplierService;
  }

  private _sellerRecruitmentService?: SellerRecruitmentService;
  private get sellerRecruitmentService(): SellerRecruitmentService {
    if (!this._sellerRecruitmentService) this._sellerRecruitmentService = new SellerRecruitmentService();
    return this._sellerRecruitmentService;
  }

  // WO-O4O-NETURE-SUPPLIER-PRODUCT-SERVICE-SPECIFIC-PRICING-FLOW-V1
  private _servicePriceService?: OfferServicePriceService;
  private get servicePriceService(): OfferServicePriceService {
    if (!this._servicePriceService) this._servicePriceService = new OfferServicePriceService(AppDataSource);
    return this._servicePriceService;
  }

  async getServicePrices(offerId: string, supplierId: string) {
    return this.servicePriceService.getByOfferForSupplier(offerId, supplierId);
  }

  async setServicePrices(offerId: string, supplierId: string, items: ServicePriceInput[]) {
    return this.servicePriceService.setPrices(offerId, supplierId, items);
  }

  private _dashboardService?: NetureDashboardService;
  private get dashboardService(): NetureDashboardService {
    if (!this._dashboardService) this._dashboardService = new NetureDashboardService();
    return this._dashboardService;
  }

  // ==================== Supplier Identity ====================

  async getSupplierIdByUserId(userId: string): Promise<string | null> {
    return this.supplierService.getSupplierIdByUserId(userId);
  }

  async getSupplierByUserId(userId: string): Promise<NetureSupplier | null> {
    return this.supplierService.getSupplierByUserId(userId);
  }

  // ==================== Supplier Onboarding ====================

  async registerSupplier(
    userId: string,
    data: { name: string; slug: string; contactEmail?: string },
  ): Promise<{ success: boolean; data?: Record<string, unknown>; error?: string }> {
    return this.supplierService.registerSupplier(userId, data);
  }

  async approveSupplier(
    supplierId: string,
    approvedByUserId: string,
  ): Promise<{ success: boolean; data?: Record<string, unknown>; error?: string; missingFields?: string[] }> {
    return this.supplierService.approveSupplier(supplierId, approvedByUserId);
  }

  async rejectSupplier(
    supplierId: string,
    rejectedByUserId: string,
    reason?: string,
  ): Promise<{ success: boolean; data?: Record<string, unknown>; error?: string }> {
    return this.supplierService.rejectSupplier(supplierId, rejectedByUserId, reason);
  }

  async getPendingSuppliers() {
    return this.supplierService.getPendingSuppliers();
  }

  async deactivateSupplier(
    supplierId: string,
    adminUserId: string,
    reason: string,
  ) {
    return this.supplierService.deactivateSupplier(supplierId, adminUserId, reason);
  }

  async reactivateSupplier(
    supplierId: string,
    adminUserId: string,
    reason: string,
  ) {
    return this.supplierService.reactivateSupplier(supplierId, adminUserId, reason);
  }

  async getGovernanceSuppliers() {
    return this.supplierService.getGovernanceSuppliers();
  }

  async getAllSuppliers(filters?: { status?: SupplierStatus }) {
    return this.supplierService.getAllSuppliers(filters);
  }

  // WO-O4O-NETURE-OPERATOR-SUPPLIER-APPROVAL-STANDARD-LIST-AND-MEMBER-IA-V1
  async getAllSuppliersPaged(params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: SupplierStatus;
    sortBy?: 'createdAt' | 'name' | 'status';
    sortOrder?: 'asc' | 'desc';
  }) {
    return this.supplierService.getAllSuppliersPaged(params);
  }

  // ==================== Admin: Product Management ====================

  async getPendingProducts() {
    return this.offerService.getPendingProducts();
  }

  async approveProduct(
    offerId: string,
    adminUserId: string,
  ): Promise<{ success: boolean; data?: Record<string, unknown>; error?: string }> {
    return this.offerService.approveProduct(offerId, adminUserId);
  }

  async rejectProduct(
    offerId: string,
    adminUserId: string,
    reason?: string,
  ): Promise<{ success: boolean; data?: Record<string, unknown>; error?: string }> {
    return this.offerService.rejectProduct(offerId, adminUserId, reason);
  }

  async getAllProducts(
    filters?: { supplierId?: string; distributionType?: OfferDistributionType; isActive?: boolean; approvalStatus?: OfferApprovalStatus },
  ) {
    return this.offerService.getAllProducts(filters);
  }

  // WO-O4O-ADMIN-PRODUCT-APPROVAL-BACKEND-PAGINATION-V1
  async getAllProductsPaged(options?: {
    supplierId?: string;
    distributionType?: OfferDistributionType;
    isActive?: boolean;
    approvalStatus?: OfferApprovalStatus;
    search?: string;
    sortBy?: string;
    sortOrder?: string;
    page?: number;
    limit?: number;
  }) {
    return this.offerService.getAllProductsPaged(options);
  }

  async getProductsSummary(filters?: {
    supplierId?: string;
    distributionType?: OfferDistributionType;
    isActive?: boolean;
  }) {
    return this.offerService.getProductsSummary(filters);
  }

  // ==================== Suppliers (Public) ====================

  async getSuppliers(filters?: { category?: string; status?: SupplierStatus }) {
    return this.supplierService.getSuppliers(filters);
  }

  async getSupplierBySlug(slug: string, viewerId?: string | null) {
    return this.supplierService.getSupplierBySlug(slug, viewerId);
  }

  // ==================== Supplier Profile ====================

  async getSupplierProfile(supplierId: string) {
    return this.supplierService.getSupplierProfile(supplierId);
  }

  // WO-NETURE-B2B-SUPPLIER-ORDER-CONDITION-V1
  async getSupplierOrderCondition(supplierId: string) {
    return this.supplierService.getSupplierOrderCondition(supplierId);
  }

  async updateSupplierProfile(
    supplierId: string,
    data: {
      contactEmail?: string;
      contactPhone?: string;
      contactWebsite?: string;
      contactKakao?: string;
      contactEmailVisibility?: ContactVisibility;
      contactPhoneVisibility?: ContactVisibility;
      contactWebsiteVisibility?: ContactVisibility;
      contactKakaoVisibility?: ContactVisibility;
      businessNumber?: string;
      representativeName?: string;
      businessAddress?: string;
      // WO-O4O-POSTAL-CODE-ADDRESS-V1
      businessZipCode?: string;
      businessAddressDetail?: string;
      managerName?: string;
      managerPhone?: string;
      businessType?: string;
      businessItem?: string;
      taxInvoiceEmail?: string;
      // WO-O4O-NETURE-SUPPLIER-PROFILE-P4-FIELDS-ADD-V1
      businessEntityType?: string;
      businessStartDate?: string;
      // WO-NETURE-B2B-SUPPLIER-ORDER-CONDITION-V1
      minOrderAmount?: number | null;
      minOrderSurcharge?: number | null;
      orderConditionNote?: string | null;
      // WO-O4O-NETURE-SUPPLIER-SHIPPING-SETTING-FOUNDATION-V1
      baseShippingFee?: number | null;
      freeShippingThreshold?: number | null;
      averageDispatchDays?: number | null;
      returnExchangeNotice?: string | null;
      shippingStandard?: string | null;
      shippingIsland?: string | null;
      shippingMountain?: string | null;
    },
  ) {
    return this.supplierService.updateSupplierProfile(supplierId, data);
  }

  async computeProfileCompleteness(supplierId: string) {
    return this.supplierService.computeProfileCompleteness(supplierId);
  }

  // ==================== Supplier Products ====================

  async getSupplierProducts(supplierId: string) {
    return this.offerService.getSupplierProducts(supplierId);
  }

  // WO-NETURE-SUPPLIER-EXCEL-LIST-V1: paginated + batch
  async getSupplierProductsPaginated(supplierId: string, options?: Parameters<typeof this.offerService.getSupplierProductsPaginated>[1]) {
    return this.offerService.getSupplierProductsPaginated(supplierId, options);
  }

  // WO-O4O-NETURE-PRODUCT-LIFECYCLE-FINALIZATION-V1: approval tab counts
  // WO-NETURE-SUPPLIER-PRODUCT-LIST-APPROVAL-TAB-LABEL-AND-COUNT-ALIGN-V1: forward filters
  async getSupplierProductApprovalCounts(
    supplierId: string,
    options?: Parameters<typeof this.offerService.getSupplierProductApprovalCounts>[1],
  ) {
    return this.offerService.getSupplierProductApprovalCounts(supplierId, options);
  }

  async batchUpdateSupplierOffers(supplierId: string, updates: Parameters<typeof this.offerService.batchUpdateSupplierOffers>[1]) {
    return this.offerService.batchUpdateSupplierOffers(supplierId, updates);
  }

  async batchToggleOfferActive(offerIds: string[], isActive: boolean) {
    return this.offerService.batchToggleOfferActive(offerIds, isActive);
  }

  async bulkDeleteOffers(...args: Parameters<typeof this.offerService.bulkDeleteOffers>) {
    return this.offerService.bulkDeleteOffers(...args);
  }

  /** WO-NETURE-PRODUCT-LIFECYCLE-COMPLETION-V1 */
  async submitForApproval(supplierId: string, offerIds: string[]) {
    return this.offerService.submitForApproval(supplierId, offerIds);
  }

  async createSupplierOffer(
    supplierId: string,
    data: {
      barcode?: string;
      name?: string;
      categoryId?: string;
      brandName?: string;
      manualData?: {
        regulatoryType?: string;
        regulatoryName?: string;
        manufacturerName?: string;
        name?: string;
        mfdsPermitNumber?: string | null;
        categoryId?: string | null;
        brandId?: string | null;
        specification?: string | null;
        originCountry?: string | null;
        tags?: string[];
      };
      distributionType?: OfferDistributionType;
      serviceKeys?: string[];
      priceGeneral?: number;
      priceGold?: number | null;
      pricePlatinum?: number | null;
      consumerReferencePrice?: number | null;
      consumerShortDescription?: string | null;
      consumerDetailDescription?: string | null;
      // WO-KPA-RECOMMENDED-TAB-REPLACE-CURATION-WITH-SUPPLIER-HIGHLIGHT-V1
      isFeatured?: boolean;
    }
  ) {
    return this.offerService.createSupplierOffer(supplierId, data);
  }

  async updateSupplierOffer(
    offerId: string,
    supplierId: string,
    updates: {
      isActive?: boolean;
      isPublic?: boolean;
      distributionType?: OfferDistributionType;
      allowedSellerIds?: string[] | null;
      priceGeneral?: number;
      priceGold?: number | null;
      pricePlatinum?: number | null;
      consumerReferencePrice?: number | null;
      stockQuantity?: number;
      consumerShortDescription?: string | null;
      consumerDetailDescription?: string | null;
      name?: string;
      // WO-NETURE-PRODUCT-FIELD-GAP-FIX-V1: Master-level fields
      categoryId?: string | null;
      brandId?: string | null;
      specification?: string | null;
      originCountry?: string | null;
      tags?: string[];
      // WO-KPA-RECOMMENDED-TAB-REPLACE-CURATION-WITH-SUPPLIER-HIGHLIGHT-V1
      isFeatured?: boolean;
    }
  ) {
    return this.offerService.updateSupplierOffer(offerId, supplierId, updates);
  }

  // WO-O4O-NETURE-SUPPLIER-PRODUCT-DISTRIBUTION-MANAGEMENT-FLOW-V1
  async updateDistribution(
    offerId: string,
    supplierId: string,
    userId: string,
    input: { isPublic?: boolean; serviceKeys?: string[] },
  ) {
    return this.offerService.updateDistribution(offerId, supplierId, userId, input);
  }

  /**
   * 승인 대상이 아닌 서비스 1개의 제공 시작/중지 (pharmacy-hub 등).
   * WO-PHARMACY-HUB-SUPPLIER-PRODUCT-OFFER-DELIVERY-V1
   */
  async setServiceDelivery(
    offerId: string,
    supplierId: string,
    serviceKey: string,
    input: { enabled: boolean; unitPrice?: number | null },
  ) {
    return this.offerService.setServiceDelivery(offerId, supplierId, serviceKey, input);
  }

  // WO-NETURE-B2B-CONTENT-MANAGEMENT-V1
  async updateBusinessContent(
    offerId: string,
    supplierId: string,
    updates: {
      businessShortDescription?: string | null;
      businessDetailDescription?: string | null;
    },
  ) {
    return this.offerService.updateBusinessContent(offerId, supplierId, updates);
  }

  // ==================== Product Master ====================

  async getProductMasterByBarcode(barcode: string): Promise<ProductMaster | null> {
    return this.catalogService.getProductMasterByBarcode(barcode);
  }

  async getProductMasterById(id: string): Promise<ProductMaster | null> {
    return this.catalogService.getProductMasterById(id);
  }

  async resolveOrCreateMaster(
    // WO-O4O-PRODUCT-MASTER-BARCODELESS-REGISTRATION-INTERNAL-CODE-V1: barcode 선택 (미제공 시 내부코드 생성)
    barcode: string | null | undefined,
    manualData?: {
      regulatoryType?: string;
      regulatoryName?: string;
      manufacturerName?: string;
      name?: string;
      mfdsPermitNumber?: string | null;
      drugCategory?: string | null;
    }
    // WO-O4O-SUPPLIER-EXISTING-PRODUCTMASTER-NON-DESTRUCTIVE-LINK-V1:
    //   `created` 로 신규 생성 / 기존 master 연결을 구분할 수 있다.
  ): Promise<MasterResolveResult> {
    return this.catalogService.resolveOrCreateMaster(barcode, manualData);
  }

  async updateProductMaster(
    masterId: string,
    updates: Record<string, unknown>
  ): Promise<{ success: boolean; data?: ProductMaster; error?: string }> {
    return this.catalogService.updateProductMaster(masterId, updates);
  }

  async getAllProductMasters() {
    return this.catalogService.getAllProductMasters();
  }

  async searchProductMasters(params: {
    q?: string;
    categoryId?: string;
    brandId?: string;
    regulatoryType?: string;
    drugCategory?: string;
    statuses?: ('ACTIVE' | 'SUSPENDED' | 'ARCHIVED')[];
    page?: number;
    limit?: number;
  }): Promise<{ data: ProductMaster[]; total: number }> {
    return this.catalogService.searchProductMasters(params);
  }

  /** 상품 이용 상태 단건 변경 — WO-O4O-ADMIN-PRODUCT-MASTER-STATUS-ACTIONS-V1 */
  async setProductMasterStatus(params: {
    masterId: string;
    status: 'ACTIVE' | 'SUSPENDED' | 'ARCHIVED';
    reason?: string | null;
    actorId: string;
  }) {
    return this.catalogService.setProductMasterStatus(params);
  }

  // ==================== Category ====================

  async getCategoryTree(): Promise<ProductCategory[]> {
    return this.catalogService.getCategoryTree();
  }

  async createCategory(data: {
    name: string;
    slug: string;
    parentId?: string | null;
    sortOrder?: number;
    isRegulated?: boolean;
  }): Promise<ProductCategory> {
    return this.catalogService.createCategory(data);
  }

  async updateCategory(id: string, data: Partial<{
    name: string;
    slug: string;
    sortOrder: number;
    isActive: boolean;
    isRegulated: boolean;
  }>): Promise<ProductCategory> {
    return this.catalogService.updateCategory(id, data);
  }

  async deleteCategory(id: string): Promise<void> {
    return this.catalogService.deleteCategory(id);
  }

  // ==================== Brand ====================

  async getAllBrands(): Promise<Brand[]> {
    return this.catalogService.getAllBrands();
  }

  async createBrand(data: {
    name: string;
    slug: string;
    manufacturerName?: string;
    countryOfOrigin?: string;
  }): Promise<Brand> {
    return this.catalogService.createBrand(data);
  }

  async updateBrand(id: string, data: Partial<{
    name: string;
    slug: string;
    manufacturerName: string;
    countryOfOrigin: string;
    isActive: boolean;
  }>): Promise<Brand> {
    return this.catalogService.updateBrand(id, data);
  }

  async deleteBrand(id: string): Promise<void> {
    return this.catalogService.deleteBrand(id);
  }

  async searchBrands(search?: string): Promise<Array<Brand & { productCount: number }>> {
    return this.catalogService.searchBrands(search);
  }

  async mergeBrands(sourceBrandId: string, targetBrandId: string): Promise<{ merged: number }> {
    return this.catalogService.mergeBrands(sourceBrandId, targetBrandId);
  }

  // ==================== Product Images ====================

  async getProductImages(masterId: string): Promise<ProductImage[]> {
    return this.catalogService.getProductImages(masterId);
  }

  async addProductImage(
    masterId: string,
    imageUrl: string,
    gcsPath: string,
    type?: 'thumbnail' | 'detail' | 'content',
    isPrimary?: boolean
  ): Promise<ProductImage & { replacedGcsPath?: string }> {
    return this.catalogService.addProductImage(masterId, imageUrl, gcsPath, type, isPrimary);
  }

  async setPrimaryImage(imageId: string, masterId: string): Promise<void> {
    return this.catalogService.setPrimaryImage(imageId, masterId);
  }

  async deleteProductImage(imageId: string, masterId: string): Promise<{ gcsPath: string }> {
    return this.catalogService.deleteProductImage(imageId, masterId);
  }

  // ==================== Dashboard Summaries ====================

  async getSupplierOrdersSummary(supplierId: string) {
    return this.dashboardService.getSupplierOrdersSummary(supplierId);
  }

  async getSupplierDashboardSummary(supplierId: string) {
    return this.dashboardService.getSupplierDashboardSummary(supplierId);
  }

  async getAdminDashboardSummary() {
    return this.dashboardService.getAdminDashboardSummary();
  }

  async getSellerDashboardInsight(sellerId: string) {
    return this.dashboardService.getSellerDashboardInsight(sellerId);
  }

  // ==================== Operator Supply ====================

  async getOperatorSupplyProducts(operatorUserId: string) {
    return this.offerService.getOperatorSupplyProducts(operatorUserId);
  }

  /** WO-NETURE-OPERATOR-ALL-OFFERS-VIEW-FOUNDATION-V1 */
  async getAllRegisteredOffers(options: Parameters<typeof this.offerService.getAllRegisteredOffers>[0]) {
    return this.offerService.getAllRegisteredOffers(options);
  }

  // ==================== Seller Recruitment (판매자 모집 · 비-Partner) ====================
  // WO-O4O-LEGACY-PARTNER-RUNTIME-RETIREMENT-AND-SELLER-RECRUITMENT-EXTRACTION-V1:
  //   운영자 노출 승인 큐 · 매장 browse 컨트롤러가 쓰는 위임 메서드. 본체는 SellerRecruitmentService.

  async getSellerRecruitments(filters?: { status?: RecruitmentStatus; serviceKey?: string; exposureStatus?: ExposureStatus }) {
    return this.sellerRecruitmentService.getRecruitments(filters);
  }

  // WO-O4O-SELLER-RECRUITMENT-EXPOSURE-BACKEND-V1: 운영자 노출 승인 큐 + approve/reject
  async getRecruitmentsForExposureReview(filters?: { serviceKey?: string; exposureStatus?: ExposureStatus; status?: RecruitmentStatus }) {
    return this.sellerRecruitmentService.getRecruitmentsForExposureReview(filters);
  }

  async setRecruitmentExposure(recruitmentId: string, operatorUserId: string, decision: ExposureStatus.APPROVED | ExposureStatus.REJECTED, note?: string, serviceKey?: string) {
    return this.sellerRecruitmentService.setRecruitmentExposure(recruitmentId, operatorUserId, decision, note, serviceKey);
  }
}
