import { Request, Response } from 'express';
import { AppDataSource } from '../../database/connection.js';
import { Supplier, SupplierStatus, SupplierTier } from '../../entities/Supplier.js';
import { User } from '../../entities/User.js';
import { BusinessInfo } from '../../entities/BusinessInfo.js';
import { validate } from 'class-validator';

/**
 * Supplier Entity Controller
 * Handles all CRUD operations for Supplier entities (SSOT)
 */
export class SupplierEntityController {

  /**
   * GET /api/v1/entity/suppliers
   * List all suppliers with filtering and pagination
   */
  async list(req: Request, res: Response): Promise<void> {
    try {
      const {
        status,
        tier,
        search,
        page = 1,
        limit = 20,
        sortBy = 'createdAt',
        sortOrder = 'DESC'
      } = req.query;

      const supplierRepo = AppDataSource.getRepository(Supplier);
      const queryBuilder = supplierRepo.createQueryBuilder('supplier')
        .leftJoinAndSelect('supplier.user', 'user')
        .leftJoinAndSelect('supplier.businessInfo', 'businessInfo');

      // Apply filters
      if (status) {
        queryBuilder.andWhere('supplier.status = :status', { status });
      }

      if (tier) {
        queryBuilder.andWhere('supplier.tier = :tier', { tier });
      }

      if (search) {
        queryBuilder.andWhere(
          '(supplier.companyDescription ILIKE :search OR user.fullName ILIKE :search OR user.email ILIKE :search)',
          { search: `%${search}%` }
        );
      }

      // Check authorization
      const userId = (req as any).user?.id;
      const userRole = (req as any).user?.role;

      if (userRole !== 'admin' && userRole !== 'super_admin') {
        // Non-admin users can only see their own supplier profile
        queryBuilder.andWhere('supplier.userId = :userId', { userId });
      }

      // Pagination
      const pageNum = Math.max(1, Number(page));
      const limitNum = Math.min(100, Math.max(1, Number(limit)));
      const skip = (pageNum - 1) * limitNum;

      queryBuilder
        .orderBy(`supplier.${String(sortBy)}`, sortOrder as any)
        .skip(skip)
        .take(limitNum);

      const [suppliers, total] = await queryBuilder.getManyAndCount();

      res.json({
        success: true,
        data: suppliers,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum)
        }
      });
    } catch (error) {
      console.error('Error listing suppliers:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to list suppliers'
      });
    }
  }

  /**
   * GET /api/v1/entity/suppliers/:id
   * Get a single supplier by ID
   */
  async get(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const supplierRepo = AppDataSource.getRepository(Supplier);

      const supplier = await supplierRepo.findOne({
        where: { id },
        relations: ['user', 'businessInfo', 'products']
      });

      if (!supplier) {
        res.status(404).json({
          success: false,
          error: 'Supplier not found'
        });
        return;
      }

      // Authorization check
      const userId = (req as any).user?.id;
      const userRole = (req as any).user?.role;

      if (userRole !== 'admin' && userRole !== 'super_admin' && supplier.userId !== userId) {
        res.status(403).json({
          success: false,
          error: 'You do not have permission to view this supplier'
        });
        return;
      }

      res.json({
        success: true,
        data: supplier
      });
    } catch (error) {
      console.error('Error fetching supplier:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch supplier'
      });
    }
  }

  /**
   * POST /api/v1/entity/suppliers
   * Create a new supplier
   */
  async create(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      const supplierRepo = AppDataSource.getRepository(Supplier);
      const userRepo = AppDataSource.getRepository(User);

      // Check if user already has a supplier profile
      const existingSupplier = await supplierRepo.findOne({
        where: { userId }
      });

      if (existingSupplier) {
        res.status(400).json({
          success: false,
          error: 'User already has a supplier profile'
        });
        return;
      }

      // Validate input
      const {
        companyDescription,
        specialties,
        certifications,
        website,
        sellerTierDiscounts,
        defaultPartnerCommissionRate,
        taxId,
        bankName,
        bankAccount,
        accountHolder,
        contactPerson,
        contactPhone,
        contactEmail,
        operatingHours,
        timezone,
        shippingMethods,
        paymentMethods,
        foundedYear,
        employeeCount,
        socialMedia,
        metadata
      } = req.body;

      // Validate email format
      if (contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
        res.status(400).json({
          success: false,
          error: 'Invalid email format'
        });
        return;
      }

      // Validate commission rate
      if (defaultPartnerCommissionRate !== undefined) {
        const rate = Number(defaultPartnerCommissionRate);
        if (isNaN(rate) || rate < 0 || rate > 100) {
          res.status(400).json({
            success: false,
            error: 'Commission rate must be between 0 and 100'
          });
          return;
        }
      }

      // Create supplier
      const supplier = supplierRepo.create({
        userId,
        status: SupplierStatus.PENDING,
        tier: SupplierTier.BASIC,
        isActive: true,
        companyDescription,
        specialties: Array.isArray(specialties) ? specialties : undefined,
        certifications: Array.isArray(certifications) ? certifications : undefined,
        website,
        sellerTierDiscounts,
        defaultPartnerCommissionRate: defaultPartnerCommissionRate || 5.0,
        taxId,
        bankName,
        bankAccount,
        accountHolder,
        contactPerson,
        contactPhone: contactPhone ? contactPhone.replace(/\D/g, '') : contactPhone,
        contactEmail,
        operatingHours: Array.isArray(operatingHours) ? operatingHours : undefined,
        timezone,
        shippingMethods: Array.isArray(shippingMethods) ? shippingMethods : undefined,
        paymentMethods: Array.isArray(paymentMethods) ? paymentMethods : undefined,
        foundedYear,
        employeeCount,
        socialMedia,
        metadata
      });

      const savedSupplier = await supplierRepo.save(supplier);

      res.status(201).json({
        success: true,
        data: savedSupplier,
        message: 'Supplier created successfully'
      });
    } catch (error) {
      console.error('Error creating supplier:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create supplier',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * PUT /api/v1/entity/suppliers/:id
   * Update an existing supplier
   */
  async update(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = (req as any).user?.id;
      const userRole = (req as any).user?.role;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      const supplierRepo = AppDataSource.getRepository(Supplier);

      const supplier = await supplierRepo.findOne({
        where: { id }
      });

      if (!supplier) {
        res.status(404).json({
          success: false,
          error: 'Supplier not found'
        });
        return;
      }

      // Authorization check
      if (userRole !== 'admin' && userRole !== 'super_admin' && supplier.userId !== userId) {
        res.status(403).json({
          success: false,
          error: 'You do not have permission to update this supplier'
        });
        return;
      }

      // Update fields (partial update)
      const {
        companyDescription,
        specialties,
        certifications,
        website,
        sellerTierDiscounts,
        defaultPartnerCommissionRate,
        taxId,
        bankName,
        bankAccount,
        accountHolder,
        contactPerson,
        contactPhone,
        contactEmail,
        operatingHours,
        timezone,
        shippingMethods,
        paymentMethods,
        foundedYear,
        employeeCount,
        socialMedia,
        metadata
      } = req.body;

      // Validate email if provided
      if (contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
        res.status(400).json({
          success: false,
          error: 'Invalid email format'
        });
        return;
      }

      // Validate commission rate if provided
      if (defaultPartnerCommissionRate !== undefined) {
        const rate = Number(defaultPartnerCommissionRate);
        if (isNaN(rate) || rate < 0 || rate > 100) {
          res.status(400).json({
            success: false,
            error: 'Commission rate must be between 0 and 100'
          });
          return;
        }
      }

      // Apply updates
      if (companyDescription !== undefined) supplier.companyDescription = companyDescription;
      if (specialties !== undefined) supplier.specialties = Array.isArray(specialties) ? specialties : undefined;
      if (certifications !== undefined) supplier.certifications = Array.isArray(certifications) ? certifications : undefined;
      if (website !== undefined) supplier.website = website;
      if (sellerTierDiscounts !== undefined) supplier.sellerTierDiscounts = sellerTierDiscounts;
      if (defaultPartnerCommissionRate !== undefined) supplier.defaultPartnerCommissionRate = defaultPartnerCommissionRate;
      if (taxId !== undefined) supplier.taxId = taxId;
      if (bankName !== undefined) supplier.bankName = bankName;
      if (bankAccount !== undefined) supplier.bankAccount = bankAccount;
      if (accountHolder !== undefined) supplier.accountHolder = accountHolder;
      if (contactPerson !== undefined) supplier.contactPerson = contactPerson;
      if (contactPhone !== undefined) supplier.contactPhone = contactPhone ? contactPhone.replace(/\D/g, '') : contactPhone;
      if (contactEmail !== undefined) supplier.contactEmail = contactEmail;
      if (operatingHours !== undefined) supplier.operatingHours = Array.isArray(operatingHours) ? operatingHours : undefined;
      if (timezone !== undefined) supplier.timezone = timezone;
      if (shippingMethods !== undefined) supplier.shippingMethods = Array.isArray(shippingMethods) ? shippingMethods : undefined;
      if (paymentMethods !== undefined) supplier.paymentMethods = Array.isArray(paymentMethods) ? paymentMethods : undefined;
      if (foundedYear !== undefined) supplier.foundedYear = foundedYear;
      if (employeeCount !== undefined) supplier.employeeCount = employeeCount;
      if (socialMedia !== undefined) supplier.socialMedia = socialMedia;
      if (metadata !== undefined) supplier.metadata = { ...supplier.metadata, ...metadata };

      const updatedSupplier = await supplierRepo.save(supplier);

      res.json({
        success: true,
        data: updatedSupplier,
        message: 'Supplier updated successfully'
      });
    } catch (error) {
      console.error('Error updating supplier:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update supplier'
      });
    }
  }

  /**
   * DELETE /api/v1/entity/suppliers/:id
   * Delete a supplier (soft delete by setting isActive = false)
   */
  async delete(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = (req as any).user?.id;
      const userRole = (req as any).user?.role;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      const supplierRepo = AppDataSource.getRepository(Supplier);

      const supplier = await supplierRepo.findOne({
        where: { id }
      });

      if (!supplier) {
        res.status(404).json({
          success: false,
          error: 'Supplier not found'
        });
        return;
      }

      // Authorization check
      if (userRole !== 'admin' && userRole !== 'super_admin' && supplier.userId !== userId) {
        res.status(403).json({
          success: false,
          error: 'You do not have permission to delete this supplier'
        });
        return;
      }

      // Soft delete
      supplier.isActive = false;
      supplier.status = SupplierStatus.SUSPENDED;
      await supplierRepo.save(supplier);

      res.json({
        success: true,
        message: 'Supplier deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting supplier:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete supplier'
      });
    }
  }

  /**
   * PUT /api/v1/entity/suppliers/:id/approve
   * Approve a supplier (admin only)
   */
  async approve(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const adminId = (req as any).user?.id;
      const userRole = (req as any).user?.role;

      if (userRole !== 'admin' && userRole !== 'super_admin') {
        res.status(403).json({
          success: false,
          error: 'Admin access required'
        });
        return;
      }

      const supplierRepo = AppDataSource.getRepository(Supplier);

      const supplier = await supplierRepo.findOne({
        where: { id }
      });

      if (!supplier) {
        res.status(404).json({
          success: false,
          error: 'Supplier not found'
        });
        return;
      }

      supplier.approve(adminId);
      await supplierRepo.save(supplier);

      res.json({
        success: true,
        data: supplier,
        message: 'Supplier approved successfully'
      });
    } catch (error) {
      console.error('Error approving supplier:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to approve supplier'
      });
    }
  }

  /**
   * PUT /api/v1/entity/suppliers/:id/reject
   * Reject a supplier (admin only)
   */
  async reject(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userRole = (req as any).user?.role;

      if (userRole !== 'admin' && userRole !== 'super_admin') {
        res.status(403).json({
          success: false,
          error: 'Admin access required'
        });
        return;
      }

      const supplierRepo = AppDataSource.getRepository(Supplier);

      const supplier = await supplierRepo.findOne({
        where: { id }
      });

      if (!supplier) {
        res.status(404).json({
          success: false,
          error: 'Supplier not found'
        });
        return;
      }

      supplier.reject();
      await supplierRepo.save(supplier);

      res.json({
        success: true,
        data: supplier,
        message: 'Supplier rejected successfully'
      });
    } catch (error) {
      console.error('Error rejecting supplier:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to reject supplier'
      });
    }
  }
}
