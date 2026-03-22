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
 *   - NeturePartnerContractService (partner recruitment, application, contract)
 *   - NeturePartnershipService (partnership request CRUD)
 */

import { NetureCatalogService } from './services/catalog.service.js';
import { NetureOfferService } from './services/offer.service.js';
import { NetureSupplierService } from './services/supplier.service.js';
import { NetureDashboardService } from './services/neture-dashboard.service.js';
import { NeturePartnerContractService } from './services/partner-contract.service.js';
import { NeturePartnershipService } from './services/partnership.service.js';

import type { NetureSupplier, SupplierStatus, OfferDistributionType, OfferApprovalStatus, ContactVisibility, ProductMaster, ProductCategory, Brand, ProductImage } from './entities/index.js';
import type { NeturePartner } from '../../routes/neture/entities/neture-partner.entity.js';
import type { PartnershipStatus, RecruitmentStatus } from './entities/index.js';

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

  private _dashboardService?: NetureDashboardService;
  private get dashboardService(): NetureDashboardService {
    if (!this._dashboardService) this._dashboardService = new NetureDashboardService();
    return this._dashboardService;
  }

  private _partnerContractService?: NeturePartnerContractService;
  private get partnerContractService(): NeturePartnerContractService {
    if (!this._partnerContractService) this._partnerContractService = new NeturePartnerContractService();
    return this._partnerContractService;
  }

  private _partnershipService?: NeturePartnershipService;
  private get partnershipService(): NeturePartnershipService {
    if (!this._partnershipService) this._partnershipService = new NeturePartnershipService();
    return this._partnershipService;
  }

  // ==================== Supplier Identity ====================

  async getSupplierIdByUserId(userId: string): Promise<string | null> {
    return this.supplierService.getSupplierIdByUserId(userId);
  }

  async getSupplierByUserId(userId: string): Promise<NetureSupplier | null> {
    return this.supplierService.getSupplierByUserId(userId);
  }

  // ==================== Partner Identity ====================

  async getPartnerByUserId(userId: string): Promise<NeturePartner | null> {
    return this.partnerContractService.getPartnerByUserId(userId);
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
  ): Promise<{ success: boolean; data?: Record<string, unknown>; error?: string }> {
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
  ): Promise<{ success: boolean; data?: Record<string, unknown>; error?: string }> {
    return this.supplierService.deactivateSupplier(supplierId, adminUserId);
  }

  async getAllSuppliers(filters?: { status?: SupplierStatus }) {
    return this.supplierService.getAllSuppliers(filters);
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

  async approveProducts(
    offerIds: string[],
    adminUserId: string,
  ): Promise<{ approved: string[]; failed: Array<{ id: string; error: string }> }> {
    return this.offerService.approveProducts(offerIds, adminUserId);
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

  // ==================== Suppliers (Public) ====================

  async getSuppliers(filters?: { category?: string; status?: SupplierStatus }) {
    return this.supplierService.getSuppliers(filters);
  }

  async hasApprovedPartnership(supplierId: string, viewerId: string): Promise<boolean> {
    return this.supplierService.hasApprovedPartnership(supplierId, viewerId);
  }

  async getSupplierBySlug(slug: string, viewerId?: string | null) {
    return this.supplierService.getSupplierBySlug(slug, viewerId);
  }

  // ==================== Supplier Profile ====================

  async getSupplierProfile(supplierId: string) {
    return this.supplierService.getSupplierProfile(supplierId);
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
      managerName?: string;
      managerPhone?: string;
      businessType?: string;
      taxEmail?: string;
    },
  ) {
    return this.supplierService.updateSupplierProfile(supplierId, data);
  }

  async computeProfileCompleteness(supplierId: string) {
    return this.supplierService.computeProfileCompleteness(supplierId);
  }

  // ==================== Partnership Requests ====================

  async getPartnershipRequests(filters?: { status?: PartnershipStatus }) {
    return this.partnershipService.getPartnershipRequests(filters);
  }

  async getPartnershipRequestById(id: string) {
    return this.partnershipService.getPartnershipRequestById(id);
  }

  async createPartnershipRequest(data: {
    sellerId: string;
    sellerName: string;
    sellerServiceType?: string;
    sellerStoreUrl?: string;
    periodStart?: string;
    periodEnd?: string;
    revenueStructure?: string;
    promotionSns?: boolean;
    promotionContent?: boolean;
    promotionBanner?: boolean;
    promotionOther?: string;
    contactEmail?: string;
    contactPhone?: string;
    contactKakao?: string;
    products?: Array<{ name: string; category?: string }>;
  }) {
    return this.partnershipService.createPartnershipRequest(data);
  }

  async updatePartnershipRequestStatus(id: string, status: PartnershipStatus) {
    return this.partnershipService.updatePartnershipRequestStatus(id, status);
  }

  // ==================== Supplier Products ====================

  async getSupplierProducts(supplierId: string) {
    return this.offerService.getSupplierProducts(supplierId);
  }

  async createSupplierOffer(
    supplierId: string,
    data: {
      barcode: string;
      manualData?: {
        regulatoryType?: string;
        regulatoryName: string;
        manufacturerName: string;
        marketingName?: string;
        mfdsPermitNumber?: string | null;
        categoryId?: string | null;
        brandId?: string | null;
        specification?: string | null;
        originCountry?: string | null;
        tags?: string[];
      };
      distributionType?: OfferDistributionType;
      priceGeneral?: number;
      consumerReferencePrice?: number | null;
      consumerShortDescription?: string | null;
      consumerDetailDescription?: string | null;
    }
  ) {
    return this.offerService.createSupplierOffer(supplierId, data);
  }

  async updateSupplierOffer(
    offerId: string,
    supplierId: string,
    updates: {
      isActive?: boolean;
      distributionType?: OfferDistributionType;
      allowedSellerIds?: string[] | null;
      priceGeneral?: number;
      consumerReferencePrice?: number | null;
      consumerShortDescription?: string | null;
      consumerDetailDescription?: string | null;
    }
  ) {
    return this.offerService.updateSupplierOffer(offerId, supplierId, updates);
  }

  // ==================== Product Master ====================

  async getProductMasterByBarcode(barcode: string): Promise<ProductMaster | null> {
    return this.catalogService.getProductMasterByBarcode(barcode);
  }

  async getProductMasterById(id: string): Promise<ProductMaster | null> {
    return this.catalogService.getProductMasterById(id);
  }

  async resolveOrCreateMaster(
    barcode: string,
    manualData?: {
      regulatoryType?: string;
      regulatoryName: string;
      manufacturerName: string;
      marketingName?: string;
      mfdsPermitNumber?: string | null;
    }
  ): Promise<{ success: boolean; data?: ProductMaster; error?: string }> {
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
    page?: number;
    limit?: number;
  }): Promise<{ data: ProductMaster[]; total: number }> {
    return this.catalogService.searchProductMasters(params);
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
  }): Promise<ProductCategory> {
    return this.catalogService.createCategory(data);
  }

  async updateCategory(id: string, data: Partial<{
    name: string;
    slug: string;
    sortOrder: number;
    isActive: boolean;
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

  // ==================== Product Images ====================

  async getProductImages(masterId: string): Promise<ProductImage[]> {
    return this.catalogService.getProductImages(masterId);
  }

  async addProductImage(
    masterId: string,
    imageUrl: string,
    gcsPath: string,
    isPrimary?: boolean
  ): Promise<ProductImage> {
    return this.catalogService.addProductImage(masterId, imageUrl, gcsPath, isPrimary);
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

  async getPartnerDashboardSummary(userId: string) {
    return this.dashboardService.getPartnerDashboardSummary(userId);
  }

  async getSellerDashboardInsight(sellerId: string) {
    return this.dashboardService.getSellerDashboardInsight(sellerId);
  }

  // ==================== Operator Supply ====================

  async getOperatorSupplyProducts(operatorUserId: string) {
    return this.offerService.getOperatorSupplyProducts(operatorUserId);
  }

  // ==================== Partner Recruitment & Application ====================

  async getPartnerRecruitments(filters?: { status?: RecruitmentStatus }) {
    return this.partnerContractService.getPartnerRecruitments(filters);
  }

  async createPartnerApplication(recruitmentId: string, partnerId: string, partnerName: string) {
    return this.partnerContractService.createPartnerApplication(recruitmentId, partnerId, partnerName);
  }

  async approvePartnerApplication(applicationId: string, sellerId: string) {
    return this.partnerContractService.approvePartnerApplication(applicationId, sellerId);
  }

  async rejectPartnerApplication(applicationId: string, sellerId: string, reason?: string) {
    return this.partnerContractService.rejectPartnerApplication(applicationId, sellerId, reason);
  }

  // ==================== Seller-Partner Contracts ====================

  async terminateContract(
    contractId: string,
    actorId: string,
    actorType: 'seller' | 'partner',
  ) {
    return this.partnerContractService.terminateContract(contractId, actorId, actorType);
  }

  async getSellerContracts(sellerId: string, status?: string) {
    return this.partnerContractService.getSellerContracts(sellerId, status);
  }

  async getPartnerContracts(partnerId: string, status?: string) {
    return this.partnerContractService.getPartnerContracts(partnerId, status);
  }

  async updateCommissionRate(contractId: string, newRate: number, sellerId: string) {
    return this.partnerContractService.updateCommissionRate(contractId, newRate, sellerId);
  }
}
