import { Repository } from 'typeorm';
import { Supplier, SupplierStatus, SupplierTier } from '../entities/Supplier.js';
import { User } from '../../../entities/User.js';
import { BaseService } from '../../../common/base.service.js';
import logger from '../../../utils/logger.js';
import { AppDataSource } from '../../../database/connection.js';
import { SupplierApplicationDto, UpdateSupplierDto } from '../dto/supplier-application.dto.js';
import { UpdateSupplierProfileDto } from '../dto/supplier-profile.dto.js';

/**
 * SupplierService
 * NextGen V2 - BaseService pattern
 * Phase B-4 Step 2: Complete CRUD implementation
 * Handles supplier operations with User integration
 */
export class SupplierService extends BaseService<Supplier> {
  private static instance: SupplierService;
  private userRepository: Repository<User>;

  constructor() {
    const repo = AppDataSource.getRepository(Supplier);
    super(repo);
    this.userRepository = AppDataSource.getRepository(User);
  }

  static getInstance(): SupplierService {
    if (!SupplierService.instance) {
      SupplierService.instance = new SupplierService();
    }
    return SupplierService.instance;
  }

  /**
   * Get Supplier by User ID
   * Used to find supplier profile for authenticated user
   */
  async getSupplierByUserId(userId: string): Promise<Supplier | null> {
    try {
      return await this.repository.findOne({
        where: { userId },
        relations: ['user', 'businessInfo', 'products'],
      });
    } catch (error: any) {
      logger.error('[SupplierService.getSupplierByUserId] Error', {
        error: error.message,
        userId,
      });
      throw new Error('Failed to get supplier');
    }
  }

  /**
   * Alias for getSupplierByUserId
   * Matches SellerService naming convention
   */
  async getByUserId(userId: string): Promise<Supplier | null> {
    return this.getSupplierByUserId(userId);
  }

  /**
   * Get Supplier by ID
   * Mirrors SellerService.findById for structural consistency
   */
  async findById(id: string): Promise<Supplier | null> {
    try {
      return await this.repository.findOne({
        where: { id },
        relations: ['user', 'businessInfo'],
      });
    } catch (error: any) {
      logger.error('[SupplierService.findById] Error', {
        error: error.message,
        id,
      });
      throw new Error('Failed to find supplier');
    }
  }

  /**
   * Create new Supplier from application
   * Status starts as PENDING, requires admin approval
   * Phase B-4 Step 2: Added User validation and duplicate checks
   */
  async createSupplier(userId: string, dto: SupplierApplicationDto): Promise<Supplier> {
    try {
      // Check if user exists
      const user = await this.userRepository.findOne({
        where: { id: userId }
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Check if supplier already exists for this user
      const existing = await this.repository.findOne({
        where: { userId }
      });

      if (existing) {
        throw new Error('Supplier already exists for this user');
      }

      // Create Supplier entity
      const supplier = this.repository.create({
        userId,
        status: SupplierStatus.PENDING,
        tier: SupplierTier.BASIC,
        isActive: true,
        companyDescription: dto.companyDescription,
        specialties: dto.specialties,
        certifications: dto.certifications,
        website: dto.website,
        sellerTierDiscounts: dto.sellerTierDiscounts,
        supplierPolicy: dto.supplierPolicy,
        defaultPartnerCommissionRate: dto.defaultPartnerCommissionRate || 5.0,
        defaultPartnerCommissionAmount: dto.defaultPartnerCommissionAmount,
        taxId: dto.taxId,
        bankName: dto.bankName,
        bankAccount: dto.bankAccount,
        accountHolder: dto.accountHolder,
        contactPerson: dto.contactPerson,
        contactPhone: dto.contactPhone,
        contactEmail: dto.contactEmail,
        operatingHours: dto.operatingHours,
        timezone: dto.timezone,
        shippingMethods: dto.shippingMethods,
        paymentMethods: dto.paymentMethods,
        foundedYear: dto.foundedYear,
        employeeCount: dto.employeeCount,
        socialMedia: dto.socialMedia,
        metadata: dto.metadata,
        metrics: {
          totalProducts: 0,
          totalOrders: 0,
          totalRevenue: 0,
          averageRating: 0,
          responseTime: 0,
          fulfillmentRate: 0
        },
        averageRating: 0,
        totalReviews: 0
      });

      const saved = await this.repository.save(supplier);

      logger.info(`[SupplierService] Supplier application created`, {
        userId,
        supplierId: saved.id,
        status: SupplierStatus.PENDING
      });

      return saved;
    } catch (error: any) {
      logger.error('[SupplierService.createSupplier] Error', {
        error: error.message,
        userId,
      });
      throw error;
    }
  }

  /**
   * Update Supplier profile
   * Supplier can update company info, policies, etc.
   * Phase B-4 Step 2: Renamed from updateSupplier to updateSupplierProfile for consistency
   */
  async updateSupplierProfile(
    supplierId: string,
    dto: UpdateSupplierProfileDto
  ): Promise<Supplier> {
    try {
      const supplier = await this.repository.findOne({
        where: { id: supplierId },
      });

      if (!supplier) {
        throw new Error('Supplier not found');
      }

      // Update fields from DTO
      if (dto.companyDescription !== undefined) {
        supplier.companyDescription = dto.companyDescription;
      }
      if (dto.specialties) {
        supplier.specialties = dto.specialties;
      }
      if (dto.certifications) {
        supplier.certifications = dto.certifications;
      }
      if (dto.website) {
        supplier.website = dto.website;
      }
      if (dto.sellerTierDiscounts) {
        supplier.sellerTierDiscounts = {
          ...supplier.sellerTierDiscounts,
          ...dto.sellerTierDiscounts
        };
      }
      if (dto.supplierPolicy) {
        supplier.supplierPolicy = {
          ...supplier.supplierPolicy,
          ...dto.supplierPolicy
        };
      }
      if (dto.defaultPartnerCommissionRate !== undefined) {
        supplier.defaultPartnerCommissionRate = dto.defaultPartnerCommissionRate;
      }
      if (dto.defaultPartnerCommissionAmount !== undefined) {
        supplier.defaultPartnerCommissionAmount = dto.defaultPartnerCommissionAmount;
      }
      if (dto.contactPerson) {
        supplier.contactPerson = dto.contactPerson;
      }
      if (dto.contactPhone) {
        supplier.contactPhone = dto.contactPhone;
      }
      if (dto.contactEmail) {
        supplier.contactEmail = dto.contactEmail;
      }
      if (dto.operatingHours) {
        supplier.operatingHours = dto.operatingHours;
      }
      if (dto.timezone) {
        supplier.timezone = dto.timezone;
      }
      if (dto.shippingMethods) {
        supplier.shippingMethods = dto.shippingMethods;
      }
      if (dto.paymentMethods) {
        supplier.paymentMethods = dto.paymentMethods;
      }
      if (dto.foundedYear) {
        supplier.foundedYear = dto.foundedYear;
      }
      if (dto.employeeCount) {
        supplier.employeeCount = dto.employeeCount;
      }
      if (dto.socialMedia) {
        supplier.socialMedia = {
          ...supplier.socialMedia,
          ...dto.socialMedia
        };
      }

      const updated = await this.repository.save(supplier);

      logger.info(`[SupplierService] Supplier profile updated`, {
        supplierId,
        updates: Object.keys(dto)
      });

      return updated;
    } catch (error: any) {
      logger.error('[SupplierService.updateSupplierProfile] Error', {
        error: error.message,
        supplierId,
      });
      throw error;
    }
  }

  /**
   * Get Supplier statistics
   * Phase B-4 Step 2: New method for Dashboard KPI integration
   */
  async getSupplierStats(supplierId: string): Promise<{
    totalProducts: number;
    activeProducts: number;
    totalOrders: number;
    totalRevenue: number;
    averageRating: number;
    totalReviews: number;
    fulfillmentRate: number;
    responseTime: number;
  }> {
    try {
      const supplier = await this.repository.findOne({
        where: { id: supplierId },
        relations: ['products']
      });

      if (!supplier) {
        throw new Error('Supplier not found');
      }

      const activeProducts = supplier.products?.filter(p => p.isActive).length || 0;

      return {
        totalProducts: supplier.metrics?.totalProducts || supplier.products?.length || 0,
        activeProducts,
        totalOrders: supplier.metrics?.totalOrders || 0,
        totalRevenue: supplier.metrics?.totalRevenue || 0,
        averageRating: supplier.averageRating || 0,
        totalReviews: supplier.totalReviews || 0,
        fulfillmentRate: supplier.metrics?.fulfillmentRate || 0,
        responseTime: supplier.metrics?.responseTime || 0
      };
    } catch (error: any) {
      logger.error('[SupplierService.getSupplierStats] Error', {
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
      const supplier = await this.repository.findOne({
        where: { id: supplierId },
      });

      if (!supplier) {
        throw new Error('Supplier not found');
      }

      supplier.approve(approvedBy);
      return await this.repository.save(supplier);
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

      const queryBuilder = this.repository.createQueryBuilder('supplier');

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
