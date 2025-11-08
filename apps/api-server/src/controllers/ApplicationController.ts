import { Response } from 'express';
import { AppDataSource } from '../database/connection.js';
import { Supplier, SupplierStatus } from '../entities/Supplier.js';
import { Seller, SellerStatus } from '../entities/Seller.js';
import { Partner, PartnerStatus } from '../entities/Partner.js';
import { BusinessInfo } from '../entities/BusinessInfo.js';
import { User, UserStatus } from '../entities/User.js';
import { AuthRequest } from '../types/auth.js';
import logger from '../utils/logger.js';
import { nanoid } from 'nanoid';

export class ApplicationController {
  /**
   * 공급자 신청
   * POST /api/v1/applications/supplier
   */
  static async applyAsSupplier(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.authUser?.id;
      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const {
        // BusinessInfo fields
        businessNumber,
        businessName,
        ceoName,
        businessAddress,
        businessPhone,
        taxEmail,
        managerName,
        managerPhone,
        managerEmail,
        // Supplier specific fields
        suppliedCategories,
        applicationMessage,
        website,
        certifications
      } = req.body;

      // 이미 신청했는지 확인
      const supplierRepo = AppDataSource.getRepository(Supplier);
      const existingSupplier = await supplierRepo.findOne({ where: { userId } });

      if (existingSupplier) {
        return res.status(400).json({
          message: '이미 공급자 신청을 하셨습니다.',
          status: existingSupplier.status
        });
      }

      // BusinessInfo 생성
      const businessInfoRepo = AppDataSource.getRepository(BusinessInfo);
      const businessInfo = businessInfoRepo.create({
        userId,
        type: 'corporate',
        businessNumber,
        businessName,
        representativeName: ceoName,
        address: businessAddress,
        phone: businessPhone,
        email: taxEmail,
        contactPerson: managerName,
        contactPhone: managerPhone,
        contactEmail: managerEmail,
        isVerified: false
      });
      await businessInfoRepo.save(businessInfo);

      // Supplier 생성
      const supplier = supplierRepo.create({
        userId,
        businessInfo,
        status: SupplierStatus.PENDING,
        isActive: true,
        suppliedCategories: suppliedCategories ? suppliedCategories.split(',').map((c: string) => c.trim()) : [],
        applicationMessage,
        website,
        certifications: certifications ? certifications.split(',').map((c: string) => c.trim()) : [],
        averageRating: 0,
        totalReviews: 0,
        defaultPartnerCommissionRate: 5.0
      });

      await supplierRepo.save(supplier);

      logger.info(`Supplier application created for user ${userId}`);

      return res.status(201).json({
        success: true,
        message: '공급자 신청이 완료되었습니다. 관리자 승인을 기다려주세요.',
        data: {
          supplierId: supplier.id,
          status: supplier.status
        }
      });

    } catch (error: any) {
      logger.error('Error in applyAsSupplier:', error);
      return res.status(500).json({
        message: '공급자 신청 중 오류가 발생했습니다.',
        error: error.message
      });
    }
  }

  /**
   * 판매자 신청
   * POST /api/v1/applications/seller
   */
  static async applyAsSeller(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.authUser?.id;
      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const {
        // BusinessInfo fields
        businessNumber,
        businessName,
        ceoName,
        businessAddress,
        businessPhone,
        taxEmail,
        managerName,
        managerPhone,
        managerEmail,
        // Seller specific fields
        storeName,
        storeDescription,
        salesChannels,
        applicationMessage
      } = req.body;

      // 이미 신청했는지 확인
      const sellerRepo = AppDataSource.getRepository(Seller);
      const existingSeller = await sellerRepo.findOne({ where: { userId } });

      if (existingSeller) {
        return res.status(400).json({
          message: '이미 판매자 신청을 하셨습니다.',
          status: existingSeller.status
        });
      }

      // BusinessInfo 생성
      const businessInfoRepo = AppDataSource.getRepository(BusinessInfo);
      const businessInfo = businessInfoRepo.create({
        userId,
        type: 'corporate',
        businessNumber,
        businessName,
        representativeName: ceoName,
        address: businessAddress,
        phone: businessPhone,
        email: taxEmail,
        contactPerson: managerName,
        contactPhone: managerPhone,
        contactEmail: managerEmail,
        isVerified: false
      });
      await businessInfoRepo.save(businessInfo);

      // Store slug 생성
      const storeSlug = `${storeName.toLowerCase().replace(/\s+/g, '-')}-${nanoid(6)}`;

      // Seller 생성
      const seller = sellerRepo.create({
        userId,
        businessInfo,
        status: SellerStatus.PENDING,
        isActive: true,
        branding: {
          storeName: storeName || businessName,
          storeDescription: storeDescription || ''
        },
        storeSlug,
        averageRating: 0,
        totalReviews: 0,
        totalRevenue: 0,
        monthlyRevenue: 0,
        productCount: 0,
        activeProductCount: 0,
        metadata: {
          salesChannels: salesChannels ? salesChannels.split(',').map((c: string) => c.trim()) : [],
          applicationMessage
        }
      });

      await sellerRepo.save(seller);

      logger.info(`Seller application created for user ${userId}`);

      return res.status(201).json({
        success: true,
        message: '판매자 신청이 완료되었습니다. 관리자 승인을 기다려주세요.',
        data: {
          sellerId: seller.id,
          status: seller.status,
          storeSlug: seller.storeSlug
        }
      });

    } catch (error: any) {
      logger.error('Error in applyAsSeller:', error);
      return res.status(500).json({
        message: '판매자 신청 중 오류가 발생했습니다.',
        error: error.message
      });
    }
  }

  /**
   * 파트너 신청
   * POST /api/v1/applications/partner
   */
  static async applyAsPartner(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.authUser?.id;
      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const {
        // Partner type
        partnerType, // 'individual' or 'corporate'
        // Individual fields
        name,
        phone,
        residentNumber,
        // Corporate fields
        businessNumber,
        businessName,
        ceoName,
        businessAddress,
        businessPhone,
        taxEmail,
        managerName,
        managerPhone,
        managerEmail,
        // Partner specific fields
        sellerId, // 파트너가 연결할 판매자
        bio,
        website,
        socialMedia,
        applicationMessage,
        memo
      } = req.body;

      // 이미 신청했는지 확인
      const partnerRepo = AppDataSource.getRepository(Partner);
      const existingPartner = await partnerRepo.findOne({ where: { userId } });

      if (existingPartner) {
        return res.status(400).json({
          message: '이미 파트너 신청을 하셨습니다.',
          status: existingPartner.status
        });
      }

      // sellerId 검증 (필수)
      if (!sellerId) {
        return res.status(400).json({
          message: '파트너가 연결할 판매자를 선택해주세요.'
        });
      }

      const sellerRepo = AppDataSource.getRepository(Seller);
      const seller = await sellerRepo.findOne({ where: { id: sellerId } });

      if (!seller) {
        return res.status(404).json({
          message: '선택한 판매자를 찾을 수 없습니다.'
        });
      }

      // BusinessInfo 생성 (사업체인 경우)
      let businessInfo = null;
      if (partnerType === 'corporate') {
        const businessInfoRepo = AppDataSource.getRepository(BusinessInfo);
        businessInfo = businessInfoRepo.create({
          userId,
          type: 'corporate',
          businessNumber,
          businessName,
          representativeName: ceoName,
          address: businessAddress,
          phone: businessPhone,
          email: taxEmail,
          contactPerson: managerName,
          contactPhone: managerPhone,
          contactEmail: managerEmail,
          isVerified: false
        });
        await businessInfoRepo.save(businessInfo);
      }

      // Referral code 생성
      const referralCode = nanoid(10);
      const frontendUrl = process.env.FRONTEND_URL || 'https://neture.co.kr';
      const referralLink = `${frontendUrl}?ref=${referralCode}`;

      // Partner 생성
      const partner = partnerRepo.create({
        userId,
        sellerId,
        status: PartnerStatus.PENDING,
        isActive: true,
        referralCode,
        referralLink,
        profile: {
          bio: bio || '',
          website,
          socialMedia: socialMedia ? JSON.parse(socialMedia) : {},
        },
        applicationMessage: applicationMessage || memo,
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
        monthlyEarnings: 0,
        metadata: {
          partnerType,
          ...(partnerType === 'individual' && { name, phone, residentNumber })
        }
      });

      await partnerRepo.save(partner);

      logger.info(`Partner application created for user ${userId}`);

      return res.status(201).json({
        success: true,
        message: '파트너 신청이 완료되었습니다. 승인을 기다려주세요.',
        data: {
          partnerId: partner.id,
          status: partner.status,
          referralCode: partner.referralCode
        }
      });

    } catch (error: any) {
      logger.error('Error in applyAsPartner:', error);
      return res.status(500).json({
        message: '파트너 신청 중 오류가 발생했습니다.',
        error: error.message
      });
    }
  }

  /**
   * 내 신청 상태 조회
   * GET /api/v1/applications/status
   */
  static async getApplicationStatus(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.authUser?.id;
      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const supplierRepo = AppDataSource.getRepository(Supplier);
      const sellerRepo = AppDataSource.getRepository(Seller);
      const partnerRepo = AppDataSource.getRepository(Partner);

      const [supplier, seller, partner] = await Promise.all([
        supplierRepo.findOne({ where: { userId } }),
        sellerRepo.findOne({ where: { userId } }),
        partnerRepo.findOne({ where: { userId } })
      ]);

      return res.json({
        success: true,
        data: {
          supplier: supplier ? {
            id: supplier.id,
            status: supplier.status,
            createdAt: supplier.createdAt,
            approvedAt: supplier.approvedAt
          } : null,
          seller: seller ? {
            id: seller.id,
            status: seller.status,
            storeSlug: seller.storeSlug,
            createdAt: seller.createdAt,
            approvedAt: seller.approvedAt
          } : null,
          partner: partner ? {
            id: partner.id,
            status: partner.status,
            referralCode: partner.referralCode,
            createdAt: partner.createdAt,
            approvedAt: partner.approvedAt
          } : null
        }
      });

    } catch (error: any) {
      logger.error('Error in getApplicationStatus:', error);
      return res.status(500).json({
        message: '신청 상태 조회 중 오류가 발생했습니다.',
        error: error.message
      });
    }
  }
}
