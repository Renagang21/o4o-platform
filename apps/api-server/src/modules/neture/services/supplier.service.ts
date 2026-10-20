import { Repository } from 'typeorm';
import { AppDataSource } from '../../../database/connection.js';
import { NetureSupplier } from '../entities/index.js';
import logger from '../../../utils/logger.js';
import { resolveSupplierIdForUser } from '../middleware/supplier-context.resolver.js';
import { NetureSupplierBusinessService } from './supplier-business.service.js';
import { NetureSupplierLifecycleService } from './supplier-lifecycle.service.js';
import { NetureSupplierDirectoryService } from './supplier-directory.service.js';

export { SupplierProfileFieldUnsupportedError, SupplierProfileNameInvalidError } from './supplier-business.service.js';
export type { SupplierObligationGuard } from './supplier-lifecycle.service.js';
export { applySupplierListQuery } from './supplier-directory.service.js';
export type { GovernanceSupplierRow, SupplierListQueryParams, SupplierListItemLike } from './supplier-directory.service.js';

/** Compatibility facade for supplier identity, Business, lifecycle, and directory consumers. */
export class NetureSupplierService {
  // Lazy repositories
  private _supplierRepo?: Repository<NetureSupplier>;

  private get supplierRepo(): Repository<NetureSupplier> {
    if (!this._supplierRepo) {
      this._supplierRepo = AppDataSource.getRepository(NetureSupplier);
    }
    return this._supplierRepo;
  }

  private _businessService?: NetureSupplierBusinessService;

  private get businessService(): NetureSupplierBusinessService {
    if (!this._businessService) this._businessService = new NetureSupplierBusinessService();
    return this._businessService;
  }

  private _lifecycleService?: NetureSupplierLifecycleService;
  private get lifecycleService(): NetureSupplierLifecycleService {
    if (!this._lifecycleService) this._lifecycleService = new NetureSupplierLifecycleService(this.businessService);
    return this._lifecycleService;
  }

  private _directoryService?: NetureSupplierDirectoryService;
  private get directoryService(): NetureSupplierDirectoryService {
    if (!this._directoryService) this._directoryService = new NetureSupplierDirectoryService(this.businessService);
    return this._directoryService;
  }

  // ==================== Supplier Identity ====================

  // WO-O4O-SUPPLIER-CANONICAL-RUNTIME-AND-PRODUCTION-FINAL-CLOSURE-V1:
  //   이 두 getter 는 Content Library · 상품 이미지 · hub-trigger 의 guard 가 쓴다. `where: { userId }`
  //   (legacy pointer) 대신 API guard 와 같은 canonical resolver 로 공급자를 찾는다.
  //   후보 N 개면 null(임의 선택 0) — 호출부는 기존 NO_SUPPLIER 계약을 유지한다.
  async getSupplierIdByUserId(userId: string): Promise<string | null> {
    try {
      const resolved = await resolveSupplierIdForUser(AppDataSource, userId);
      return resolved?.supplierId ?? null;
    } catch (error) {
      logger.error('[NetureSupplierService] Error finding supplier by user ID:', error);
      return null;
    }
  }

  async getSupplierByUserId(userId: string): Promise<NetureSupplier | null> {
    try {
      const resolved = await resolveSupplierIdForUser(AppDataSource, userId);
      if (!resolved) return null;
      return await this.supplierRepo.findOne({
        where: { id: resolved.supplierId },
        relations: ['offers'],
      });
    } catch (error) {
      logger.error('[NetureSupplierService] Error finding supplier by user ID:', error);
      return null;
    }
  }

  // ==================== Lifecycle and directory delegates ====================

  async registerSupplier(...args: Parameters<NetureSupplierLifecycleService['registerSupplier']>) {
    return this.lifecycleService.registerSupplier(...args);
  }

  async approveSupplier(...args: Parameters<NetureSupplierLifecycleService['approveSupplier']>) {
    return this.lifecycleService.approveSupplier(...args);
  }

  async rejectSupplier(...args: Parameters<NetureSupplierLifecycleService['rejectSupplier']>) {
    return this.lifecycleService.rejectSupplier(...args);
  }

  async getPendingSuppliers(...args: Parameters<NetureSupplierDirectoryService['getPendingSuppliers']>) {
    return this.directoryService.getPendingSuppliers(...args);
  }

  async deactivateSupplier(...args: Parameters<NetureSupplierLifecycleService['deactivateSupplier']>) {
    return this.lifecycleService.deactivateSupplier(...args);
  }

  async reactivateSupplier(...args: Parameters<NetureSupplierLifecycleService['reactivateSupplier']>) {
    return this.lifecycleService.reactivateSupplier(...args);
  }

  async getGovernanceSuppliers(...args: Parameters<NetureSupplierDirectoryService['getGovernanceSuppliers']>) {
    return this.directoryService.getGovernanceSuppliers(...args);
  }

  async getAllSuppliers(...args: Parameters<NetureSupplierDirectoryService['getAllSuppliers']>) {
    return this.directoryService.getAllSuppliers(...args);
  }

  async getAllSuppliersPaged(...args: Parameters<NetureSupplierDirectoryService['getAllSuppliersPaged']>) {
    return this.directoryService.getAllSuppliersPaged(...args);
  }

  async getSuppliers(...args: Parameters<NetureSupplierDirectoryService['getSuppliers']>) {
    return this.directoryService.getSuppliers(...args);
  }

  async hasApprovedPrivateSupply(...args: Parameters<NetureSupplierDirectoryService['hasApprovedPrivateSupply']>) {
    return this.directoryService.hasApprovedPrivateSupply(...args);
  }

  async getSupplierBySlug(...args: Parameters<NetureSupplierDirectoryService['getSupplierBySlug']>) {
    return this.directoryService.getSupplierBySlug(...args);
  }

  // WO-NETURE-B2B-SUPPLIER-ORDER-CONDITION-V1
  async getSupplierOrderCondition(supplierId: string) {
    return this.businessService.getSupplierOrderCondition(supplierId);
  }

  async getSupplierProfile(supplierId: string) {
    return this.businessService.getSupplierProfile(supplierId);
  }

  async updateSupplierProfile(
    supplierId: string,
    data: Parameters<NetureSupplierBusinessService['updateSupplierProfile']>[1],
  ) {
    return this.businessService.updateSupplierProfile(supplierId, data);
  }

  getMissingSaleFields(...args: Parameters<NetureSupplierBusinessService['getMissingSaleFields']>) {
    return this.businessService.getMissingSaleFields(...args);
  }

  getMissingSettlementFields(...args: Parameters<NetureSupplierBusinessService['getMissingSettlementFields']>) {
    return this.businessService.getMissingSettlementFields(...args);
  }
}
