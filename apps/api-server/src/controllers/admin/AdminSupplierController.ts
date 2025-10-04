import { Request, Response } from 'express';
import { getRepository } from 'typeorm';
import { Supplier } from '../../entities/Supplier';
import { User } from '../../entities/User';
import { validationResult } from 'express-validator';

export class AdminSupplierController {
  
  // Get all suppliers with pagination and filters
  getSuppliers = async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        page = 1,
        limit = 20,
        search,
        category,
        status,
        sortBy = 'createdAt',
        sortOrder = 'DESC'
      } = req.query;

      const supplierRepo = getRepository(Supplier);
      const queryBuilder = supplierRepo.createQueryBuilder('supplier')
        .leftJoinAndSelect('supplier.user', 'user');

      // Apply search filter
      if (search) {
        queryBuilder.where(
          '(supplier.businessName ILIKE :search OR supplier.contactPerson ILIKE :search OR supplier.email ILIKE :search)',
          { search: `%${search}%` }
        );
      }

      // Apply category filter
      if (category && category !== 'all') {
        queryBuilder.andWhere('supplier.category = :category', { category });
      }

      // Apply status filter
      if (status && status !== 'all') {
        if (status === 'active') {
          queryBuilder.andWhere('supplier.isActive = true');
        } else if (status === 'inactive') {
          queryBuilder.andWhere('supplier.isActive = false');
        } else if (status === 'verified') {
          queryBuilder.andWhere('supplier.isVerified = true');
        } else if (status === 'unverified') {
          queryBuilder.andWhere('supplier.isVerified = false');
        }
      }

      // Apply sorting
      const validSortFields = ['createdAt', 'updatedAt', 'businessName', 'rating', 'totalOrders'];
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
        relations: ['user']
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
        businessName,
        businessNumber,
        userId,
        contactPerson,
        email,
        phone,
        address,
        category,
        description,
        website,
        isActive = true,
        isVerified = false,
        rating = 0,
        commissionRate = 10,
        minimumOrder = 0,
        maxProcessingDays = 7,
        businessLicense,
        taxId,
        bankAccount,
        bankName,
        accountHolder
      } = req.body;

      const supplierRepo = getRepository(Supplier);

      // Check if business number already exists
      const existingSupplier = await supplierRepo.findOne({ where: { businessNumber } });
      if (existingSupplier) {
        res.status(400).json({
          success: false,
          error: 'Business number already exists'
        });
        return;
      }

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

      const newSupplier = supplierRepo.create({
        businessName,
        businessNumber,
        userId,
        contactPerson,
        email,
        phone,
        address,
        category,
        description,
        website,
        isActive,
        isVerified,
        rating,
        totalOrders: 0,
        totalRevenue: 0,
        commissionRate,
        minimumOrder,
        maxProcessingDays,
        businessLicense,
        taxId,
        bankAccount,
        bankName,
        accountHolder
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
        businessName,
        businessNumber,
        userId,
        contactPerson,
        email,
        phone,
        address,
        category,
        description,
        website,
        isActive,
        isVerified,
        rating,
        commissionRate,
        minimumOrder,
        maxProcessingDays,
        businessLicense,
        taxId,
        bankAccount,
        bankName,
        accountHolder
      } = req.body;

      // Check if business number is being changed and already exists
      if (businessNumber && businessNumber !== supplier.businessNumber) {
        const existingSupplier = await supplierRepo.findOne({ where: { businessNumber } });
        if (existingSupplier) {
          res.status(400).json({
            success: false,
            error: 'Business number already exists'
          });
          return;
        }
      }

      // Check if userId is provided and exists
      if (userId && userId !== supplier.userId) {
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

      // Update fields
      if (businessName !== undefined) supplier.businessName = businessName;
      if (businessNumber !== undefined) supplier.businessNumber = businessNumber;
      if (userId !== undefined) supplier.userId = userId;
      if (contactPerson !== undefined) supplier.contactPerson = contactPerson;
      if (email !== undefined) supplier.email = email;
      if (phone !== undefined) supplier.phone = phone;
      if (address !== undefined) supplier.address = address;
      if (category !== undefined) supplier.category = category;
      if (description !== undefined) supplier.description = description;
      if (website !== undefined) supplier.website = website;
      if (isActive !== undefined) supplier.isActive = isActive;
      if (isVerified !== undefined) supplier.isVerified = isVerified;
      if (rating !== undefined) supplier.rating = rating;
      if (commissionRate !== undefined) supplier.commissionRate = commissionRate;
      if (minimumOrder !== undefined) supplier.minimumOrder = minimumOrder;
      if (maxProcessingDays !== undefined) supplier.maxProcessingDays = maxProcessingDays;
      if (businessLicense !== undefined) supplier.businessLicense = businessLicense;
      if (taxId !== undefined) supplier.taxId = taxId;
      if (bankAccount !== undefined) supplier.bankAccount = bankAccount;
      if (bankName !== undefined) supplier.bankName = bankName;
      if (accountHolder !== undefined) supplier.accountHolder = accountHolder;

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

  // Update supplier verification
  updateSupplierVerification = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { isVerified } = req.body;

      const supplierRepo = getRepository(Supplier);
      const supplier = await supplierRepo.findOne({ where: { id } });

      if (!supplier) {
        res.status(404).json({
          success: false,
          error: 'Supplier not found'
        });
        return;
      }

      supplier.isVerified = isVerified;
      await supplierRepo.save(supplier);

      res.json({
        success: true,
        message: `Supplier ${isVerified ? 'verified' : 'unverified'} successfully`
      });
    } catch (error) {
      console.error('Error updating supplier verification:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update supplier verification'
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
        verifiedSuppliers,
        suppliersByCategory,
        topSuppliers
      ] = await Promise.all([
        supplierRepo.count(),
        supplierRepo.count({ where: { isActive: true } }),
        supplierRepo.count({ where: { isVerified: true } }),
        supplierRepo
          .createQueryBuilder('supplier')
          .select('supplier.category as category, COUNT(*) as count')
          .groupBy('supplier.category')
          .getRawMany(),
        supplierRepo.find({
          order: { totalRevenue: 'DESC' },
          take: 10,
          select: ['id', 'businessName', 'totalRevenue', 'totalOrders', 'rating']
        })
      ]);

      res.json({
        success: true,
        statistics: {
          total: totalSuppliers,
          active: activeSuppliers,
          inactive: totalSuppliers - activeSuppliers,
          verified: verifiedSuppliers,
          unverified: totalSuppliers - verifiedSuppliers,
          byCategory: suppliersByCategory,
          topPerforming: topSuppliers
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