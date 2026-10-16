import { SupplierOfferReadService } from './supplier-offer-read.service.js';
import { AdminOfferReadService } from './admin-offer-read.service.js';
import { OperatorOfferReadService } from './operator-offer-read.service.js';
import { SupplierOfferRegistrationService } from './supplier-offer-registration.service.js';
import { SupplierOfferWriteService } from './supplier-offer-write.service.js';
import { SupplierOfferDistributionService } from './supplier-offer-distribution.service.js';
import { OfferLifecycleService } from './offer-lifecycle.service.js';
import { OfferDistributionType, OfferApprovalStatus } from '../entities/index.js';
import type { NetureCatalogService } from './catalog.service.js';
export type { CreateOfferFromExistingMasterInput } from './supplier-offer-registration.service.js';

/** Compatibility facade for role-specific reads and offer write workflows. */
export class NetureOfferService {
  private get supplierOfferReadService(): SupplierOfferReadService {
    if (!this._supplierOfferReadService) this._supplierOfferReadService = new SupplierOfferReadService();
    return this._supplierOfferReadService;
  }
  private get adminOfferReadService(): AdminOfferReadService {
    if (!this._adminOfferReadService) this._adminOfferReadService = new AdminOfferReadService();
    return this._adminOfferReadService;
  }
  private get operatorOfferReadService(): OperatorOfferReadService {
    if (!this._operatorOfferReadService) this._operatorOfferReadService = new OperatorOfferReadService();
    return this._operatorOfferReadService;
  }
  private _supplierOfferReadService?: SupplierOfferReadService;
  private _adminOfferReadService?: AdminOfferReadService;
  private _operatorOfferReadService?: OperatorOfferReadService;

  private _supplierOfferRegistrationService?: SupplierOfferRegistrationService;
  private get supplierOfferRegistrationService(): SupplierOfferRegistrationService {
    if (!this._supplierOfferRegistrationService) this._supplierOfferRegistrationService = new SupplierOfferRegistrationService();
    return this._supplierOfferRegistrationService;
  }

  private _supplierOfferWriteService?: SupplierOfferWriteService;
  private get supplierOfferWriteService(): SupplierOfferWriteService {
    if (!this._supplierOfferWriteService) this._supplierOfferWriteService = new SupplierOfferWriteService();
    return this._supplierOfferWriteService;
  }

  private _supplierOfferDistributionService?: SupplierOfferDistributionService;
  private get supplierOfferDistributionService(): SupplierOfferDistributionService {
    if (!this._supplierOfferDistributionService) this._supplierOfferDistributionService = new SupplierOfferDistributionService();
    return this._supplierOfferDistributionService;
  }

  private _offerLifecycleService?: OfferLifecycleService;
  private get offerLifecycleService(): OfferLifecycleService {
    if (!this._offerLifecycleService) this._offerLifecycleService = new OfferLifecycleService();
    return this._offerLifecycleService;
  }

  // Preserve the constructor contract; supplier writes never call CatalogService.
  constructor(private readonly catalogService: NetureCatalogService) {}

  async getPendingProducts(): Promise<Array<{ id: string; supplierName: string; supplierId: string; distributionType: OfferDistributionType; createdAt: Date; approvalStatus: OfferApprovalStatus }>> {
    return this.adminOfferReadService.getPendingProducts();
  }

  async approveProduct(
    offerId: string,
    adminUserId: string,
  ): Promise<{ success: boolean; data?: Record<string, unknown>; error?: string }> {
    return this.offerLifecycleService.approveProduct(offerId, adminUserId);
  }

  async rejectProduct(
    offerId: string,
    adminUserId: string,
    reason?: string,
  ): Promise<{ success: boolean; data?: Record<string, unknown>; error?: string }> {
    return this.offerLifecycleService.rejectProduct(offerId, adminUserId, reason);
  }

  async submitForApproval(
    supplierId: string,
    offerIds: string[],
  ): Promise<{
    submitted: number;
    skipped: Array<{ id: string; reason: string }>;
    errors: Array<{ id: string; error: string }>;
  }> {
    return this.offerLifecycleService.submitForApproval(supplierId, offerIds);
  }

  async getAllProducts(
    filters?: { supplierId?: string; distributionType?: OfferDistributionType; isActive?: boolean; approvalStatus?: OfferApprovalStatus },
  ) {
    return this.adminOfferReadService.getAllProducts(filters);
  }

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
  }): Promise<{ items: Array<Record<string, unknown>>; total: number }>{
    return this.adminOfferReadService.getAllProductsPaged(options);
  }

  async getProductsSummary(filters?: {
    supplierId?: string;
    distributionType?: OfferDistributionType;
    isActive?: boolean;
  }): Promise<{ total: number; pending: number; approved: number; rejected: number }>{
    return this.adminOfferReadService.getProductsSummary(filters);
  }

  async getSupplierProducts(supplierId: string) {
    return this.supplierOfferReadService.getSupplierProducts(supplierId);
  }

  async createSupplierOfferFromExistingMaster(supplierId: string, rawBody: Record<string, unknown>) {
    return this.supplierOfferRegistrationService.createSupplierOfferFromExistingMaster(supplierId, rawBody);
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
    return this.supplierOfferWriteService.updateSupplierOffer(offerId, supplierId, updates);
  }

  async updateDistribution(
    offerId: string,
    supplierId: string,
    userId: string,
    input: import('./supplier-offer-distribution.service.js').SupplierPublicationInput,
  ): Promise<{ success: boolean; error?: string; data?: Record<string, unknown> }> {
    return this.supplierOfferDistributionService.updateDistribution(offerId, supplierId, userId, input);
  }

  async updateBusinessContent(
    offerId: string,
    supplierId: string,
    updates: {
      businessShortDescription?: string | null;
      businessDetailDescription?: string | null;
    },
  ) {
    return this.supplierOfferWriteService.updateBusinessContent(offerId, supplierId, updates);
  }

  async getSupplierProductsPaginated(
    supplierId: string,
    options: {
      page?: number;
      limit?: number;
      keyword?: string;
      distributionType?: string;
      isActive?: string;
      sort?: string;
      order?: string;
      hasImage?: string;
      hasDescription?: string;
      barcodeSource?: string;
      completenessStatus?: string;
      serviceApprovalStatus?: string;
    } = {},
  ) {
    return this.supplierOfferReadService.getSupplierProductsPaginated(supplierId, options);
  }

  async getSupplierProductApprovalCounts(
    supplierId: string,
    options: {
      keyword?: string;
      distributionType?: string;
      isActive?: string;
      hasImage?: string;
      hasDescription?: string;
      barcodeSource?: string;
      completenessStatus?: string;
    } = {},
  ) {
    return this.supplierOfferReadService.getSupplierProductApprovalCounts(supplierId, options);
  }

  async batchUpdateSupplierOffers(
    supplierId: string,
    updates: Array<{
      offerId: string;
      isActive?: boolean;
      isPublic?: boolean;
      distributionType?: OfferDistributionType;
      priceGeneral?: number;
      consumerReferencePrice?: number | null;
      stockQuantity?: number;
    }>,
  ) {
    return this.supplierOfferWriteService.batchUpdateSupplierOffers(supplierId, updates);
  }

  async batchToggleOfferActive(
    offerIds: string[],
    isActive: boolean,
  ): Promise<{ updated: string[]; failed: Array<{ id: string; error: string }> }> {
    return this.offerLifecycleService.batchToggleOfferActive(offerIds, isActive);
  }

  async bulkDeleteOffers(
    supplierId: string,
    offerIds: string[],
    deletedBy?: string,
  ): Promise<{ deleted: number; failed: Array<{ id: string; error: string }> }> {
    return this.supplierOfferWriteService.bulkDeleteOffers(supplierId, offerIds, deletedBy);
  }

  async getOperatorSupplyProducts(operatorUserId: string) {
    return this.operatorOfferReadService.getOperatorSupplyProducts(operatorUserId);
  }

  async getAllRegisteredOffers(options: {
    page?: number;
    limit?: number;
    keyword?: string;
    distributionType?: string;
    isActive?: string;
    approvalStatus?: string;
    category?: string;
    regulatoryType?: string;
    sort?: string;
    order?: string;
  } = {}) {
    return this.operatorOfferReadService.getAllRegisteredOffers(options);
  }
}
