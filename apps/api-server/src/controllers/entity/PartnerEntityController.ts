import { Request, Response } from 'express';
import { AppDataSource } from '../../database/connection.js';
import { Partner, PartnerStatus, PartnerTier } from '../../entities/Partner.js';
import { User } from '../../entities/User.js';
import { Seller } from '../../entities/Seller.js';
import { validate } from 'class-validator';

/**
 * Partner Entity Controller
 * Handles all CRUD operations for Partner entities (SSOT)
 */
export class PartnerEntityController {

  /**
   * Generate unique referral code
   */
  private generateReferralCode(): string {
    const prefix = 'PTR';
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `${prefix}-${random}`;
  }

  /**
   * GET /api/v1/entity/partners
   * List all partners with filtering and pagination
   */
  async list(req: Request, res: Response): Promise<void> {
    try {
      const {
        status,
        tier,
        sellerId,
        search,
        page = 1,
        limit = 20,
        sortBy = 'createdAt',
        sortOrder = 'DESC'
      } = req.query;

      const partnerRepo = AppDataSource.getRepository(Partner);
      const queryBuilder = partnerRepo.createQueryBuilder('partner')
        .leftJoinAndSelect('partner.user', 'user')
        .leftJoinAndSelect('partner.seller', 'seller');

      // Apply filters
      if (status) {
        queryBuilder.andWhere('partner.status = :status', { status });
      }

      if (tier) {
        queryBuilder.andWhere('partner.tier = :tier', { tier });
      }

      if (sellerId) {
        queryBuilder.andWhere('partner.sellerId = :sellerId', { sellerId });
      }

      if (search) {
        queryBuilder.andWhere(
          '(partner.referralCode ILIKE :search OR user.fullName ILIKE :search OR user.email ILIKE :search)',
          { search: `%${search}%` }
        );
      }

      // Check authorization
      const userId = (req as any).user?.id;
      const userRole = (req as any).user?.role;

      if (userRole !== 'admin' && userRole !== 'super_admin') {
        // Non-admin users can only see their own partner profile
        queryBuilder.andWhere('partner.userId = :userId', { userId });
      }

      // Pagination
      const pageNum = Math.max(1, Number(page));
      const limitNum = Math.min(100, Math.max(1, Number(limit)));
      const skip = (pageNum - 1) * limitNum;

      queryBuilder
        .orderBy(`partner.${String(sortBy)}`, sortOrder as any)
        .skip(skip)
        .take(limitNum);

      const [partners, total] = await queryBuilder.getManyAndCount();

      res.json({
        success: true,
        data: partners,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum)
        }
      });
    } catch (error) {
      console.error('Error listing partners:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to list partners'
      });
    }
  }

  /**
   * GET /api/v1/entity/partners/:id
   * Get a single partner by ID
   */
  async get(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const partnerRepo = AppDataSource.getRepository(Partner);

      const partner = await partnerRepo.findOne({
        where: { id },
        relations: ['user', 'seller']
      });

      if (!partner) {
        res.status(404).json({
          success: false,
          error: 'Partner not found'
        });
        return;
      }

      // Authorization check
      const userId = (req as any).user?.id;
      const userRole = (req as any).user?.role;

      if (userRole !== 'admin' && userRole !== 'super_admin' && partner.userId !== userId) {
        res.status(403).json({
          success: false,
          error: 'You do not have permission to view this partner'
        });
        return;
      }

      res.json({
        success: true,
        data: partner
      });
    } catch (error) {
      console.error('Error fetching partner:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch partner'
      });
    }
  }

  /**
   * POST /api/v1/entity/partners
   * Create a new partner
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

      const partnerRepo = AppDataSource.getRepository(Partner);
      const userRepo = AppDataSource.getRepository(User);
      const sellerRepo = AppDataSource.getRepository(Seller);

      // Check if user already has a partner profile
      const existingPartner = await partnerRepo.findOne({
        where: { userId }
      });

      if (existingPartner) {
        res.status(400).json({
          success: false,
          error: 'User already has a partner profile'
        });
        return;
      }

      // Validate input
      const {
        sellerId,
        profile,
        payoutInfo,
        minimumPayout,
        applicationMessage,
        allowedPromotionTypes,
        canUseProductImages,
        canCreateCoupons,
        emailNotifications,
        smsNotifications,
        preferredLanguage,
        metadata
      } = req.body;

      // Validate sellerId exists
      if (!sellerId) {
        res.status(400).json({
          success: false,
          error: 'Seller ID is required'
        });
        return;
      }

      const seller = await sellerRepo.findOne({
        where: { id: sellerId }
      });

      if (!seller) {
        res.status(400).json({
          success: false,
          error: 'Seller not found'
        });
        return;
      }

      // Validate payout info if provided
      if (payoutInfo) {
        if (!payoutInfo.method || !payoutInfo.currency) {
          res.status(400).json({
            success: false,
            error: 'Payout method and currency are required'
          });
          return;
        }

        if (payoutInfo.method === 'bank' && (!payoutInfo.bankName || !payoutInfo.accountNumber)) {
          res.status(400).json({
            success: false,
            error: 'Bank details are required for bank transfer method'
          });
          return;
        }

        if (payoutInfo.method === 'paypal' && !payoutInfo.paypalEmail) {
          res.status(400).json({
            success: false,
            error: 'PayPal email is required for PayPal method'
          });
          return;
        }

        if (payoutInfo.method === 'crypto' && !payoutInfo.cryptoAddress) {
          res.status(400).json({
            success: false,
            error: 'Crypto address is required for crypto method'
          });
          return;
        }
      }

      // Generate unique referral code
      let referralCode = this.generateReferralCode();
      let attempts = 0;
      while (attempts < 10) {
        const existingCode = await partnerRepo.findOne({
          where: { referralCode }
        });
        if (!existingCode) break;
        referralCode = this.generateReferralCode();
        attempts++;
      }

      if (attempts >= 10) {
        res.status(500).json({
          success: false,
          error: 'Failed to generate unique referral code'
        });
        return;
      }

      // Create partner
      const partner = partnerRepo.create({
        userId,
        sellerId,
        status: PartnerStatus.PENDING,
        tier: PartnerTier.BRONZE,
        isActive: true,
        referralCode,
        referralLink: '', // Will be generated after save
        profile: profile || undefined,
        payoutInfo: payoutInfo || undefined,
        minimumPayout: minimumPayout || 50000,
        applicationMessage,
        allowedPromotionTypes: Array.isArray(allowedPromotionTypes) ? allowedPromotionTypes : undefined,
        canUseProductImages: canUseProductImages !== undefined ? canUseProductImages : true,
        canCreateCoupons: canCreateCoupons !== undefined ? canCreateCoupons : true,
        emailNotifications: emailNotifications !== undefined ? emailNotifications : true,
        smsNotifications: smsNotifications !== undefined ? smsNotifications : true,
        preferredLanguage: preferredLanguage || 'ko',
        metadata,
        totalEarnings: 0,
        availableBalance: 0,
        pendingBalance: 0,
        paidOut: 0,
        totalClicks: 0,
        totalOrders: 0,
        conversionRate: 0,
        averageOrderValue: 0,
        monthlyClicks: 0,
        monthlyOrders: 0,
        monthlyEarnings: 0
      });

      // Generate referral link
      partner.referralLink = partner.generateReferralLink();

      const savedPartner = await partnerRepo.save(partner);

      res.status(201).json({
        success: true,
        data: savedPartner,
        message: 'Partner created successfully'
      });
    } catch (error) {
      console.error('Error creating partner:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create partner',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * PUT /api/v1/entity/partners/:id
   * Update an existing partner
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

      const partnerRepo = AppDataSource.getRepository(Partner);

      const partner = await partnerRepo.findOne({
        where: { id }
      });

      if (!partner) {
        res.status(404).json({
          success: false,
          error: 'Partner not found'
        });
        return;
      }

      // Authorization check
      if (userRole !== 'admin' && userRole !== 'super_admin' && partner.userId !== userId) {
        res.status(403).json({
          success: false,
          error: 'You do not have permission to update this partner'
        });
        return;
      }

      // Update fields (partial update)
      const {
        profile,
        payoutInfo,
        minimumPayout,
        allowedPromotionTypes,
        canUseProductImages,
        canCreateCoupons,
        emailNotifications,
        smsNotifications,
        preferredLanguage,
        metadata
      } = req.body;

      // Validate payout info if provided
      if (payoutInfo) {
        if (payoutInfo.method && !payoutInfo.currency) {
          res.status(400).json({
            success: false,
            error: 'Currency is required when updating payout method'
          });
          return;
        }
      }

      // Apply updates
      if (profile !== undefined) {
        partner.profile = { ...partner.profile, ...profile };
      }
      if (payoutInfo !== undefined) {
        partner.payoutInfo = { ...partner.payoutInfo, ...payoutInfo };
      }
      if (minimumPayout !== undefined) partner.minimumPayout = minimumPayout;
      if (allowedPromotionTypes !== undefined) {
        partner.allowedPromotionTypes = Array.isArray(allowedPromotionTypes) ? allowedPromotionTypes : undefined;
      }
      if (canUseProductImages !== undefined) partner.canUseProductImages = canUseProductImages;
      if (canCreateCoupons !== undefined) partner.canCreateCoupons = canCreateCoupons;
      if (emailNotifications !== undefined) partner.emailNotifications = emailNotifications;
      if (smsNotifications !== undefined) partner.smsNotifications = smsNotifications;
      if (preferredLanguage !== undefined) partner.preferredLanguage = preferredLanguage;
      if (metadata !== undefined) partner.metadata = { ...partner.metadata, ...metadata };

      const updatedPartner = await partnerRepo.save(partner);

      res.json({
        success: true,
        data: updatedPartner,
        message: 'Partner updated successfully'
      });
    } catch (error) {
      console.error('Error updating partner:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update partner'
      });
    }
  }

  /**
   * DELETE /api/v1/entity/partners/:id
   * Delete a partner (soft delete by setting isActive = false)
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

      const partnerRepo = AppDataSource.getRepository(Partner);

      const partner = await partnerRepo.findOne({
        where: { id }
      });

      if (!partner) {
        res.status(404).json({
          success: false,
          error: 'Partner not found'
        });
        return;
      }

      // Authorization check
      if (userRole !== 'admin' && userRole !== 'super_admin' && partner.userId !== userId) {
        res.status(403).json({
          success: false,
          error: 'You do not have permission to delete this partner'
        });
        return;
      }

      // Soft delete
      partner.isActive = false;
      partner.status = PartnerStatus.SUSPENDED;
      await partnerRepo.save(partner);

      res.json({
        success: true,
        message: 'Partner deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting partner:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete partner'
      });
    }
  }

  /**
   * PUT /api/v1/entity/partners/:id/approve
   * Approve a partner (admin only)
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

      const partnerRepo = AppDataSource.getRepository(Partner);

      const partner = await partnerRepo.findOne({
        where: { id }
      });

      if (!partner) {
        res.status(404).json({
          success: false,
          error: 'Partner not found'
        });
        return;
      }

      partner.approve(adminId);
      await partnerRepo.save(partner);

      res.json({
        success: true,
        data: partner,
        message: 'Partner approved successfully'
      });
    } catch (error) {
      console.error('Error approving partner:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to approve partner'
      });
    }
  }

  /**
   * PUT /api/v1/entity/partners/:id/reject
   * Reject a partner (admin only)
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

      const { reason } = req.body;

      if (!reason) {
        res.status(400).json({
          success: false,
          error: 'Rejection reason is required'
        });
        return;
      }

      const partnerRepo = AppDataSource.getRepository(Partner);

      const partner = await partnerRepo.findOne({
        where: { id }
      });

      if (!partner) {
        res.status(404).json({
          success: false,
          error: 'Partner not found'
        });
        return;
      }

      partner.reject(reason);
      await partnerRepo.save(partner);

      res.json({
        success: true,
        data: partner,
        message: 'Partner rejected successfully'
      });
    } catch (error) {
      console.error('Error rejecting partner:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to reject partner'
      });
    }
  }

  /**
   * GET /api/v1/entity/partners/:id/referral-link
   * Generate referral link for specific product/seller
   */
  async getReferralLink(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { productId, sellerId } = req.query;
      const userId = (req as any).user?.id;
      const userRole = (req as any).user?.role;

      const partnerRepo = AppDataSource.getRepository(Partner);

      const partner = await partnerRepo.findOne({
        where: { id }
      });

      if (!partner) {
        res.status(404).json({
          success: false,
          error: 'Partner not found'
        });
        return;
      }

      // Authorization check
      if (userRole !== 'admin' && userRole !== 'super_admin' && partner.userId !== userId) {
        res.status(403).json({
          success: false,
          error: 'You do not have permission to access this partner'
        });
        return;
      }

      const link = partner.generateReferralLink(
        productId as string | undefined,
        sellerId as string | undefined
      );

      res.json({
        success: true,
        data: {
          referralCode: partner.referralCode,
          referralLink: link,
          productId: productId || null,
          sellerId: sellerId || null
        }
      });
    } catch (error) {
      console.error('Error generating referral link:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate referral link'
      });
    }
  }
}
