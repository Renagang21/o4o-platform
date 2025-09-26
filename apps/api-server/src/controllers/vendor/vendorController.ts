import { Request, Response } from 'express';
import { AppDataSource } from '../../database/connection';
import { VendorInfo } from '../../entities/VendorInfo';
import { VendorCommission } from '../../entities/VendorCommission';
import { User } from '../../entities/User';
import { AuthRequest } from '../../types/auth';
import { Like, IsNull, Not } from 'typeorm';
import { validate } from 'class-validator';
import logger from '../../utils/logger';

export class VendorController {
  private vendorRepository = AppDataSource.getRepository(VendorInfo);
  private userRepository = AppDataSource.getRepository(User);
  private commissionRepository = AppDataSource.getRepository(VendorCommission);

  // GET /api/vendors - Get all vendors with filtering and pagination
  getAllVendors = async (req: Request, res: Response) => {
    try {
      const {
        page = 1,
        limit = 10,
        status,
        vendorType,
        search,
        sortBy = 'createdAt',
        sortOrder = 'DESC',
      } = req.query;

      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);

      const query = this.vendorRepository.createQueryBuilder('vendor')
        .leftJoinAndSelect('vendor.user', 'user')
        .select([
          'vendor',
          'user.id',
          'user.name',
          'user.email',
        ]);

      if (status) {
        query.andWhere('vendor.status = :status', { status });
      }

      if (vendorType) {
        query.andWhere('vendor.vendorType = :vendorType', { vendorType });
      }

      if (search) {
        query.andWhere(
          '(vendor.vendorName LIKE :search OR vendor.contactEmail LIKE :search)',
          { search: `%${search}%` }
        );
      }

      const total = await query.getCount();

      query
        .orderBy(`vendor.${sortBy}`, sortOrder as 'ASC' | 'DESC')
        .skip((pageNum - 1) * limitNum)
        .take(limitNum);

      const vendors = await query.getMany();

      res.json({
        success: true,
        data: vendors,
        total,
        page: pageNum,
        pageSize: limitNum,
        totalPages: Math.ceil(total / limitNum),
      });
    } catch (error) {
      logger.error('Error fetching vendors:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch vendors',
      });
    }
  };

  // GET /api/vendors/pending - Get pending vendors awaiting approval
  getPendingVendors = async (req: Request, res: Response) => {
    try {
      const { page = 1, limit = 10 } = req.query;
      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);

      const [vendors, total] = await this.vendorRepository.findAndCount({
        where: { status: 'pending' },
        relations: ['user'],
        order: { createdAt: 'ASC' },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
      });

      res.json({
        success: true,
        data: vendors,
        total,
        page: pageNum,
        pageSize: limitNum,
        totalPages: Math.ceil(total / limitNum),
      });
    } catch (error) {
      logger.error('Error fetching pending vendors:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch pending vendors',
      });
    }
  };

  // GET /api/vendors/statistics - Get vendor statistics
  getStatistics = async (req: Request, res: Response) => {
    try {
      const totalVendors = await this.vendorRepository.count();
      const activeVendors = await this.vendorRepository.count({ where: { status: 'active' } });
      const pendingVendors = await this.vendorRepository.count({ where: { status: 'pending' } });
      const suspendedVendors = await this.vendorRepository.count({ where: { status: 'suspended' } });

      const totalRevenue = await this.vendorRepository
        .createQueryBuilder('vendor')
        .select('SUM(vendor.totalRevenue)', 'total')
        .getRawOne();

      const averageRating = await this.vendorRepository
        .createQueryBuilder('vendor')
        .select('AVG(vendor.rating)', 'average')
        .where('vendor.rating IS NOT NULL')
        .getRawOne();

      const topVendors = await this.vendorRepository.find({
        where: { status: 'active' },
        order: { totalRevenue: 'DESC' },
        take: 5,
        relations: ['user'],
      });

      const vendorTypeDistribution = await this.vendorRepository
        .createQueryBuilder('vendor')
        .select('vendor.vendorType', 'type')
        .addSelect('COUNT(*)', 'count')
        .groupBy('vendor.vendorType')
        .getRawMany();

      res.json({
        success: true,
        data: {
          overview: {
            totalVendors,
            activeVendors,
            pendingVendors,
            suspendedVendors,
            totalRevenue: totalRevenue?.total || 0,
            averageRating: averageRating?.average || 0,
          },
          topVendors: topVendors.map(v => ({
            id: v.id,
            vendorName: v.vendorName,
            totalRevenue: v.totalRevenue,
            totalSales: v.totalSales,
            rating: v.rating,
          })),
          vendorTypeDistribution: vendorTypeDistribution.reduce((acc, item) => {
            acc[item.type] = parseInt(item.count);
            return acc;
          }, {}),
        },
      });
    } catch (error) {
      logger.error('Error fetching vendor statistics:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch vendor statistics',
      });
    }
  };

  // GET /api/vendors/:id - Get vendor details by ID
  getVendorById = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const currentUser = req.user;

      const vendor = await this.vendorRepository.findOne({
        where: { id },
        relations: ['user'],
      });

      if (!vendor) {
        return res.status(404).json({
          success: false,
          message: 'Vendor not found',
        });
      }

      // Check permissions
      if (currentUser?.role === 'vendor' && vendor.userId !== currentUser.id) {
        return res.status(403).json({
          success: false,
          message: 'You can only view your own vendor information',
        });
      }

      res.json({
        success: true,
        data: vendor,
      });
    } catch (error) {
      logger.error('Error fetching vendor:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch vendor',
      });
    }
  };

  // POST /api/vendors - Create new vendor
  createVendor = async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      const {
        vendorName,
        vendorType = 'individual',
        contactName,
        contactPhone,
        contactEmail,
        mainCategories,
        monthlyTarget,
        affiliateRate = 10,
      } = req.body;

      // Check if user already has a vendor profile
      const existingVendor = await this.vendorRepository.findOne({
        where: { userId },
      });

      if (existingVendor) {
        return res.status(409).json({
          success: false,
          message: 'Vendor profile already exists for this user',
        });
      }

      // Check if user exists
      const user = await this.userRepository.findOne({
        where: { id: userId },
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
        });
      }

      const vendor = this.vendorRepository.create({
        vendorName,
        vendorType,
        contactName,
        contactPhone,
        contactEmail,
        mainCategories,
        monthlyTarget,
        affiliateRate,
        userId,
        status: 'pending',
        totalSales: 0,
        totalRevenue: 0,
      });

      const savedVendor = await this.vendorRepository.save(vendor);

      res.status(201).json({
        success: true,
        data: savedVendor,
        message: 'Vendor created successfully',
      });
    } catch (error) {
      logger.error('Error creating vendor:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create vendor',
      });
    }
  };

  // PUT /api/vendors/:id - Update vendor information
  updateVendor = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const currentUser = req.user;
      const updateData = req.body;

      const vendor = await this.vendorRepository.findOne({
        where: { id },
      });

      if (!vendor) {
        return res.status(404).json({
          success: false,
          message: 'Vendor not found',
        });
      }

      // Check permissions
      if (currentUser?.role === 'vendor' && vendor.userId !== currentUser.id) {
        return res.status(403).json({
          success: false,
          message: 'You can only update your own vendor information',
        });
      }

      // Vendors can't change their own status
      if (currentUser?.role === 'vendor' && updateData.status) {
        delete updateData.status;
      }

      Object.assign(vendor, updateData);
      const updatedVendor = await this.vendorRepository.save(vendor);

      res.json({
        success: true,
        data: updatedVendor,
        message: 'Vendor updated successfully',
      });
    } catch (error) {
      logger.error('Error updating vendor:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update vendor',
      });
    }
  };

  // POST /api/vendors/:id/approve - Approve vendor application
  approveVendor = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const approvedBy = req.user?.id;
      const { affiliateCode, affiliateRate, notes } = req.body;

      const vendor = await this.vendorRepository.findOne({
        where: { id },
      });

      if (!vendor) {
        return res.status(404).json({
          success: false,
          message: 'Vendor not found',
        });
      }

      if (vendor.status !== 'pending') {
        return res.status(400).json({
          success: false,
          message: 'Only pending vendors can be approved',
        });
      }

      // Generate affiliate code if not provided
      const finalAffiliateCode = affiliateCode || await this.generateAffiliateCode();

      vendor.status = 'active';
      vendor.affiliateCode = finalAffiliateCode;
      vendor.affiliateRate = affiliateRate || vendor.affiliateRate || 10;
      vendor.approvedAt = new Date();
      vendor.approvedBy = approvedBy;

      const savedVendor = await this.vendorRepository.save(vendor);

      // Log the approval action
      logger.info(`Vendor ${id} approved by ${approvedBy}`, { notes });

      res.json({
        success: true,
        data: savedVendor,
        message: 'Vendor approved successfully',
      });
    } catch (error) {
      logger.error('Error approving vendor:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to approve vendor',
      });
    }
  };

  // POST /api/vendors/:id/reject - Reject vendor application
  rejectVendor = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const rejectedBy = req.user?.id;
      const { reason, notes } = req.body;

      if (!reason) {
        return res.status(400).json({
          success: false,
          message: 'Rejection reason is required',
        });
      }

      const vendor = await this.vendorRepository.findOne({
        where: { id },
      });

      if (!vendor) {
        return res.status(404).json({
          success: false,
          message: 'Vendor not found',
        });
      }

      if (vendor.status !== 'pending') {
        return res.status(400).json({
          success: false,
          message: 'Only pending vendors can be rejected',
        });
      }

      // Log the rejection action
      logger.info(`Vendor ${id} rejected by ${rejectedBy}`, { reason, notes });

      // Delete the vendor record after rejection
      await this.vendorRepository.remove(vendor);

      res.json({
        success: true,
        message: 'Vendor application rejected',
        data: {
          reason,
          notes,
        },
      });
    } catch (error) {
      logger.error('Error rejecting vendor:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to reject vendor',
      });
    }
  };

  // POST /api/vendors/:id/suspend - Suspend vendor account
  suspendVendor = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const suspendedBy = req.user?.id;
      const { reason, duration, notes } = req.body;

      if (!reason) {
        return res.status(400).json({
          success: false,
          message: 'Suspension reason is required',
        });
      }

      const vendor = await this.vendorRepository.findOne({
        where: { id },
      });

      if (!vendor) {
        return res.status(404).json({
          success: false,
          message: 'Vendor not found',
        });
      }

      if (vendor.status !== 'active') {
        return res.status(400).json({
          success: false,
          message: 'Only active vendors can be suspended',
        });
      }

      vendor.status = 'suspended';
      const savedVendor = await this.vendorRepository.save(vendor);

      // Log the suspension action
      logger.info(`Vendor ${id} suspended by ${suspendedBy}`, {
        reason,
        duration: duration || 'Indefinite',
        notes,
      });

      res.json({
        success: true,
        data: savedVendor,
        message: 'Vendor suspended successfully',
      });
    } catch (error) {
      logger.error('Error suspending vendor:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to suspend vendor',
      });
    }
  };

  // GET /api/vendors/:id/commission - Get vendor commission history
  getCommissionHistory = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const currentUser = req.user;
      const {
        startDate,
        endDate,
        page = 1,
        limit = 10,
      } = req.query;

      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);

      // Check permissions
      const vendor = await this.vendorRepository.findOne({ where: { id } });
      if (!vendor) {
        return res.status(404).json({
          success: false,
          message: 'Vendor not found',
        });
      }

      if (currentUser?.role === 'vendor' && vendor.userId !== currentUser.id) {
        return res.status(403).json({
          success: false,
          message: 'You can only view your own commission history',
        });
      }

      // Fetch actual commission data from database
      const skip = (pageNum - 1) * limitNum;
      
      const [commissions, total] = await this.commissionRepository.findAndCount({
        where: { vendorId: id },
        skip,
        take: limitNum,
        order: { createdAt: 'DESC' },
        relations: ['vendor']
      });

      const formattedCommissions = commissions.map(comm => ({
        id: comm.id,
        vendorId: comm.vendorId,
        orderId: comm.orderId,
        amount: comm.totalSales,
        rate: comm.commissionRate,
        commission: comm.commissionAmount,
        status: comm.status,
        createdAt: comm.createdAt,
      }));

      res.json({
        success: true,
        data: formattedCommissions,
        total,
        page: pageNum,
        pageSize: limitNum,
        totalPages: Math.ceil(total / limitNum),
      });
    } catch (error) {
      logger.error('Error fetching commission history:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch commission history',
      });
    }
  };

  // GET /api/vendors/:id/products - Get vendor products
  getVendorProducts = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const currentUser = req.user;
      const {
        page = 1,
        limit = 10,
        status,
      } = req.query;

      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);

      // Check permissions
      const vendor = await this.vendorRepository.findOne({ where: { id } });
      if (!vendor) {
        return res.status(404).json({
          success: false,
          message: 'Vendor not found',
        });
      }

      if (currentUser?.role === 'vendor' && vendor.userId !== currentUser.id) {
        return res.status(403).json({
          success: false,
          message: 'You can only view your own products',
        });
      }

      // Fetch actual product data from database
      const skip = (pageNum - 1) * limitNum;
      const where: any = { vendorId: id };
      
      if (status) {
        where.status = status;
      }

      const productRepository = AppDataSource.getRepository('Product');
      const [products, total] = await productRepository.findAndCount({
        where,
        skip,
        take: limitNum,
        order: { createdAt: 'DESC' }
      });

      const formattedProducts = products.map((product: any) => ({
        id: product.id,
        vendorId: product.vendorId,
        name: product.name,
        price: product.price,
        stock: product.stock || 0,
        status: product.status,
        createdAt: product.createdAt,
      }));

      res.json({
        success: true,
        data: formattedProducts,
        total,
        page: pageNum,
        pageSize: limitNum,
        totalPages: Math.ceil(total / limitNum),
      });
    } catch (error) {
      logger.error('Error fetching vendor products:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch vendor products',
      });
    }
  };

  // GET /api/vendors/:id/sales-report - Get vendor sales report
  getSalesReport = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const currentUser = req.user;
      const {
        startDate,
        endDate,
        groupBy = 'day',
      } = req.query;

      // Check permissions
      const vendor = await this.vendorRepository.findOne({ where: { id } });
      if (!vendor) {
        return res.status(404).json({
          success: false,
          message: 'Vendor not found',
        });
      }

      if (currentUser?.role === 'vendor' && vendor.userId !== currentUser.id) {
        return res.status(403).json({
          success: false,
          message: 'You can only view your own sales report',
        });
      }

      // Fetch actual sales data from database
      const orderRepository = AppDataSource.getRepository('Order');
      
      const queryBuilder = orderRepository.createQueryBuilder('order')
        .where('order.vendorId = :vendorId', { vendorId: id });
      
      if (startDate) {
        queryBuilder.andWhere('order.createdAt >= :startDate', { startDate });
      }
      if (endDate) {
        queryBuilder.andWhere('order.createdAt <= :endDate', { endDate });
      }

      // Group by period
      let groupByClause = "DATE_TRUNC('day', order.createdAt)";
      if (groupBy === 'week') {
        groupByClause = "DATE_TRUNC('week', order.createdAt)";
      } else if (groupBy === 'month') {
        groupByClause = "DATE_TRUNC('month', order.createdAt)";
      }

      const reportData = await queryBuilder
        .select(groupByClause, 'period')
        .addSelect('COUNT(order.id)', 'totalSales')
        .addSelect('SUM(order.totalAmount)', 'totalRevenue')
        .addSelect('SUM(order.commissionAmount)', 'totalCommission')
        .groupBy('period')
        .orderBy('period', 'DESC')
        .limit(10)
        .getRawMany();

      const formattedData = reportData.map(row => ({
        period: row.period,
        totalSales: parseInt(row.totalSales) || 0,
        totalRevenue: parseFloat(row.totalRevenue) || 0,
        totalCommission: parseFloat(row.totalCommission) || 0,
        avgOrderValue: row.totalSales > 0 ? (parseFloat(row.totalRevenue) / parseInt(row.totalSales)) : 0
      }));

      res.json({
        success: true,
        data: {
          vendorId: id,
          startDate: startDate || (formattedData.length > 0 ? formattedData[formattedData.length - 1].period : null),
          endDate: endDate || (formattedData.length > 0 ? formattedData[0].period : null),
          groupBy,
          data: formattedData,
          summary: {
            totalSales: formattedData.reduce((sum, r) => sum + r.totalSales, 0),
            totalRevenue: formattedData.reduce((sum, r) => sum + r.totalRevenue, 0),
            totalCommission: formattedData.reduce((sum, r) => sum + r.totalCommission, 0),
            avgOrderValue: formattedData.length > 0 ? formattedData.reduce((sum, r) => sum + r.avgOrderValue, 0) / formattedData.length : 0,
          },
        },
      });
    } catch (error) {
      logger.error('Error fetching sales report:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch sales report',
      });
    }
  };

  // GET /api/vendors/commissions - Get all vendor commissions with filtering
  getCommissions = async (req: Request, res: Response) => {
    try {
      const {
        period,
        vendorId,
        status,
        page = 1,
        limit = 10
      } = req.query;

      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const skip = (pageNum - 1) * limitNum;

      // Build query conditions
      const where: any = {};
      
      if (vendorId) {
        where.vendorId = vendorId;
      }
      
      if (status) {
        where.status = status;
      }
      
      if (period) {
        where.period = period;
      }

      // Fetch commissions from database
      const [commissions, total] = await this.commissionRepository.findAndCount({
        where,
        relations: ['vendor', 'vendor.user'],
        skip,
        take: limitNum,
        order: {
          createdAt: 'DESC'
        }
      });

      // Format response
      const formattedCommissions = commissions.map(commission => ({
        id: commission.id,
        vendorId: commission.vendorId,
        vendorName: commission.vendor?.vendorName || 'Unknown Vendor',
        period: commission.period,
        totalSales: commission.totalSales,
        commissionRate: commission.commissionRate,
        commissionAmount: commission.commissionAmount,
        status: commission.status,
        paidAt: commission.paidAt,
        createdAt: commission.createdAt
      }));

      res.json({
        success: true,
        data: formattedCommissions,
        total,
        page: pageNum,
        pageSize: limitNum,
        totalPages: Math.ceil(total / limitNum)
      });
    } catch (error) {
      logger.error('Error fetching commissions:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch commissions'
      });
    }
  };

  // GET /api/vendors/commissions/stats - Get commission statistics
  getCommissionStats = async (req: Request, res: Response) => {
    try {
      const { period } = req.query;
      
      // Build query conditions for period
      const where: any = {};
      if (period) {
        where.period = period;
      }

      // Get total commissions
      const totalResult = await this.commissionRepository
        .createQueryBuilder('commission')
        .select('SUM(commission.commissionAmount)', 'total')
        .where(where)
        .getRawOne();

      // Get paid commissions
      const paidResult = await this.commissionRepository
        .createQueryBuilder('commission')
        .select('SUM(commission.commissionAmount)', 'total')
        .where({ ...where, status: 'paid' })
        .getRawOne();

      // Get pending commissions
      const pendingResult = await this.commissionRepository
        .createQueryBuilder('commission')
        .select('SUM(commission.commissionAmount)', 'total')
        .where({ ...where, status: 'pending' })
        .getRawOne();

      // Get vendor counts
      const totalVendors = await this.vendorRepository.count();
      const activeVendors = await this.vendorRepository.count({ where: { status: 'active' } });

      // Calculate average commission rate
      const avgRateResult = await this.commissionRepository
        .createQueryBuilder('commission')
        .select('AVG(commission.commissionRate)', 'average')
        .where(where)
        .getRawOne();

      const stats = {
        totalCommissions: totalResult?.total || 0,
        paidCommissions: paidResult?.total || 0,
        pendingCommissions: pendingResult?.total || 0,
        totalVendors,
        activeVendors,
        averageCommissionRate: avgRateResult?.average || 0,
        period: period || new Date().toISOString().slice(0, 7)
      };

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      logger.error('Error fetching commission stats:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch commission statistics'
      });
    }
  };

  // Helper method to generate unique affiliate code
  private async generateAffiliateCode(): Promise<string> {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code: string;
    let exists: boolean;

    do {
      code = '';
      for (let i = 0; i < 8; i++) {
        code += characters.charAt(Math.floor(Math.random() * characters.length));
      }
      
      const existing = await this.vendorRepository.findOne({
        where: { affiliateCode: code },
      });
      exists = !!existing;
    } while (exists);

    return code;
  }
}