import { Supplier, SupplierStatus } from '../entities/Supplier.js';
import { BaseService } from '../../../common/base.service.js';
import { logger } from '../../../utils/logger.js';

/**
 * SupplierService
 * NextGen V2 - BaseService pattern
 * Handles supplier operations
 */
export class SupplierService extends BaseService<Supplier> {
  private static instance: SupplierService;

  constructor() {
    super(Supplier);
  }

  static getInstance(): SupplierService {
    if (!SupplierService.instance) {
      SupplierService.instance = new SupplierService();
    }
    return SupplierService.instance;
  }

  async getSupplierByUserId(userId: string): Promise<Supplier | null> {
    try {
      return await this.repo.findOne({
        where: { userId },
        relations: ['businessInfo', 'products'],
      });
    } catch (error: any) {
      logger.error('[SupplierService.getSupplierByUserId] Error', {
        error: error.message,
        userId,
      });
      throw new Error('Failed to get supplier');
    }
  }

  async createSupplier(userId: string, data: any): Promise<Supplier> {
    try {
      const supplier = this.repo.create({
        userId,
        ...data,
        status: SupplierStatus.PENDING,
      });
      return await this.repo.save(supplier);
    } catch (error: any) {
      logger.error('[SupplierService.createSupplier] Error', {
        error: error.message,
        userId,
      });
      throw new Error('Failed to create supplier');
    }
  }

  async updateSupplier(
    supplierId: string,
    data: Partial<Supplier>
  ): Promise<Supplier> {
    try {
      const supplier = await this.repo.findOne({
        where: { id: supplierId },
      });

      if (!supplier) {
        throw new Error('Supplier not found');
      }

      Object.assign(supplier, data);
      return await this.repo.save(supplier);
    } catch (error: any) {
      logger.error('[SupplierService.updateSupplier] Error', {
        error: error.message,
        supplierId,
      });
      throw error;
    }
  }

  async approveSupplier(
    supplierId: string,
    approvedBy: string
  ): Promise<Supplier> {
    try {
      const supplier = await this.repo.findOne({
        where: { id: supplierId },
      });

      if (!supplier) {
        throw new Error('Supplier not found');
      }

      supplier.approve(approvedBy);
      return await this.repo.save(supplier);
    } catch (error: any) {
      logger.error('[SupplierService.approveSupplier] Error', {
        error: error.message,
        supplierId,
      });
      throw error;
    }
  }

  async listSuppliers(filters: {
    status?: SupplierStatus;
    page?: number;
    limit?: number;
  }): Promise<{ suppliers: Supplier[]; total: number }> {
    try {
      const { status, page = 1, limit = 20 } = filters;
      const skip = (page - 1) * limit;

      const queryBuilder = this.repo.createQueryBuilder('supplier');

      if (status) {
        queryBuilder.andWhere('supplier.status = :status', { status });
      }

      queryBuilder
        .orderBy('supplier.createdAt', 'DESC')
        .skip(skip)
        .take(limit);

      const [suppliers, total] = await queryBuilder.getManyAndCount();

      return { suppliers, total };
    } catch (error: any) {
      logger.error('[SupplierService.listSuppliers] Error', {
        error: error.message,
      });
      throw new Error('Failed to list suppliers');
    }
  }
}
