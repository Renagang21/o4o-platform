import { Request, Response } from 'express';
import { getRepository } from 'typeorm';
import { Supplier, SupplierStatus } from '../../entities/Supplier.js';
import { User } from '../../entities/User.js';
import { validationResult } from 'express-validator';

export class AdminSupplierController {
  
  // Get all suppliers with pagination and filters
  getSuppliers = async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        page = 1,
        limit = 20,
        search,
        status,
        sortBy = 'createdAt',
        sortOrder = 'DESC'
      } = req.query;

      const supplierRepo = getRepository(Supplier);
      const queryBuilder = supplierRepo.createQueryBuilder('supplier')
        .leftJoinAndSelect('supplier.user', 'user')
        .leftJoinAndSelect('supplier.businessInfo', 'businessInfo');

      // Apply search filter
      if (search) {
        queryBuilder.where(
          '(supplier.contactPerson ILIKE :search OR supplier.contactEmail ILIKE :search OR user.email ILIKE :search)',
          { search: `%${search}%` }
        );
      }

      // Apply status filter
      if (status && status !== 'all') {
        if (status === 'active') {
          queryBuilder.andWhere('supplier.isActive = true');
        } else if (status === 'inactive') {
          queryBuilder.andWhere('supplier.isActive = false');
        } else {
          queryBuilder.andWhere('supplier.status = :status', { status });
        }
      }

      // Apply sorting
      const validSortFields = ['createdAt', 'updatedAt', 'averageRating'];
      const sortField = validSortFields.includes(sortBy as string) ? sortBy as string : 'createdAt';
      const order = sortOrder === 'ASC' ? 'ASC' : 'DESC';
      queryBuilder.orderBy(`supplier.${sortField}`, order);

      // Apply pagination
      const skip = (Number(page) - 1) * Number(limit);
      queryBuilder.skip(skip).take(Number(limit));

      const [suppliers, totalCount] = await queryBuilder.getManyAndCount();

      const totalPages = Math.ceil(totalCount / Number(limit));

      res.json({
        success: true,
        suppliers,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: totalCount,
          totalPages
        }
      });
    } catch (error) {
      console.error('Error fetching suppliers:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch suppliers'
      });
    }
  };

  // Get single supplier by ID
  getSupplier = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const supplierRepo = getRepository(Supplier);
      
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

      res.json({
        success: true,
        supplier
      });
    } catch (error) {
      console.error('Error fetching supplier:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch supplier'
      });
    }
  };

  // Create new supplier
  createSupplier = async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
        return;
      }

      const {
        userId,
        contactPerson,
        contactEmail,
        contactPhone,
        companyDescription,
        specialties,
        certifications,
        website,
        isActive = true,
        status = SupplierStatus.PENDING,
        tier = 'basic',
        taxId,
        bankName,
        bankAccount,
        accountHolder
      } = req.body;

      // Check if userId is provided and exists
      if (userId) {
        const userRepo = getRepository(User);
        const user = await userRepo.findOne({ where: { id: userId } });
        if (!user) {
          res.status(400).json({
            success: false,
            error: 'Associated user not found'
          });
          return;
        }
      }

      const supplierRepo = getRepository(Supplier);

      const newSupplier = supplierRepo.create({
        userId,
        contactPerson,
        contactEmail,
        contactPhone: contactPhone ? contactPhone.replace(/\D/g, '') : contactPhone,
        companyDescription,
        specialties,
        certifications,
        website,
        isActive,
        status,
        tier,
        taxId,
        bankName,
        bankAccount,
        accountHolder,
        averageRating: 0,
        totalReviews: 0,
        defaultPartnerCommissionRate: 5.0
      });

      const savedSupplier = await supplierRepo.save(newSupplier);

      res.status(201).json({
        success: true,
        supplier: savedSupplier,
        message: 'Supplier created successfully'
      });
    } catch (error) {
      console.error('Error creating supplier:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create supplier'
      });
    }
  };

  // Update supplier
  updateSupplier = async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
        return;
      }

      const { id } = req.params;
      const supplierRepo = getRepository(Supplier);

      const supplier = await supplierRepo.findOne({ where: { id } });
      if (!supplier) {
        res.status(404).json({
          success: false,
          error: 'Supplier not found'
        });
        return;
      }

      const {
        userId,
        contactPerson,
        contactEmail,
        contactPhone,
        companyDescription,
        specialties,
        certifications,
        website,
        isActive,
        status,
        tier,
        taxId,
        bankName,
        bankAccount,
        accountHolder,
        defaultPartnerCommissionRate
      } = req.body;

      // Update fields
      if (userId !== undefined) supplier.userId = userId;
      if (contactPerson !== undefined) supplier.contactPerson = contactPerson;
      if (contactEmail !== undefined) supplier.contactEmail = contactEmail;
      if (contactPhone !== undefined) supplier.contactPhone = contactPhone ? contactPhone.replace(/\D/g, '') : contactPhone;
      if (companyDescription !== undefined) supplier.companyDescription = companyDescription;
      if (specialties !== undefined) supplier.specialties = specialties;
      if (certifications !== undefined) supplier.certifications = certifications;
      if (website !== undefined) supplier.website = website;
      if (isActive !== undefined) supplier.isActive = isActive;
      if (status !== undefined) supplier.status = status;
      if (tier !== undefined) supplier.tier = tier;
      if (taxId !== undefined) supplier.taxId = taxId;
      if (bankName !== undefined) supplier.bankName = bankName;
      if (bankAccount !== undefined) supplier.bankAccount = bankAccount;
      if (accountHolder !== undefined) supplier.accountHolder = accountHolder;
      if (defaultPartnerCommissionRate !== undefined) supplier.defaultPartnerCommissionRate = defaultPartnerCommissionRate;

      const updatedSupplier = await supplierRepo.save(supplier);

      res.json({
        success: true,
        supplier: updatedSupplier,
        message: 'Supplier updated successfully'
      });
    } catch (error) {
      console.error('Error updating supplier:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update supplier'
      });
    }
  };

  // Update supplier status
  updateSupplierStatus = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { isActive } = req.body;

      const supplierRepo = getRepository(Supplier);
      const supplier = await supplierRepo.findOne({ where: { id } });

      if (!supplier) {
        res.status(404).json({
          success: false,
          error: 'Supplier not found'
        });
        return;
      }

      supplier.isActive = isActive;
      await supplierRepo.save(supplier);

      res.json({
        success: true,
        message: `Supplier ${isActive ? 'activated' : 'deactivated'} successfully`
      });
    } catch (error) {
      console.error('Error updating supplier status:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update supplier status'
      });
    }
  };

  // Approve supplier
  approveSupplier = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      const supplierRepo = getRepository(Supplier);
      const supplier = await supplierRepo.findOne({ where: { id } });

      if (!supplier) {
        res.status(404).json({
          success: false,
          error: 'Supplier not found'
        });
        return;
      }

      supplier.approve(userId || 'admin');
      await supplierRepo.save(supplier);

      res.json({
        success: true,
        message: 'Supplier approved successfully'
      });
    } catch (error) {
      console.error('Error approving supplier:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to approve supplier'
      });
    }
  };

  // Delete supplier
  deleteSupplier = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const supplierRepo = getRepository(Supplier);

      const supplier = await supplierRepo.findOne({ where: { id } });
      if (!supplier) {
        res.status(404).json({
          success: false,
          error: 'Supplier not found'
        });
        return;
      }

      await supplierRepo.remove(supplier);

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
  };

  // Get supplier statistics
  getSupplierStatistics = async (req: Request, res: Response): Promise<void> => {
    try {
      const supplierRepo = getRepository(Supplier);

      const [
        totalSuppliers,
        activeSuppliers,
        approvedSuppliers,
        suppliersByStatus,
        topSuppliers
      ] = await Promise.all([
        supplierRepo.count(),
        supplierRepo.count({ where: { isActive: true } }),
        supplierRepo.count({ where: { status: SupplierStatus.APPROVED } }),
        supplierRepo
          .createQueryBuilder('supplier')
          .select('supplier.status as status, COUNT(*) as count')
          .groupBy('supplier.status')
          .getRawMany(),
        supplierRepo.find({
          order: { averageRating: 'DESC' },
          take: 10,
          select: ['id', 'contactPerson', 'averageRating', 'totalReviews']
        })
      ]);

      res.json({
        success: true,
        statistics: {
          total: totalSuppliers,
          active: activeSuppliers,
          inactive: totalSuppliers - activeSuppliers,
          approved: approvedSuppliers,
          pending: totalSuppliers - approvedSuppliers,
          byStatus: suppliersByStatus,
          topRated: topSuppliers
        }
      });
    } catch (error) {
      console.error('Error fetching supplier statistics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch supplier statistics'
      });
    }
  };
}