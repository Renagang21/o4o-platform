import { Request, Response } from 'express';
import PartnerService, { 
  CreatePartnerRequest, 
  UpdatePartnerRequest, 
  PartnerFilters, 
  CommissionFilters,
  ReferralLinkParams 
} from '../services/PartnerService.js';
import logger from '../utils/logger.js';

export class PartnerController {
  private partnerService: PartnerService;

  constructor() {
    this.partnerService = new PartnerService();
  }

  // POST /api/partners/apply - 파트너 등록 신청
  applyAsPartner = async (req: Request, res: Response): Promise<void> => {
    try {
      const applicationData: CreatePartnerRequest = {
        ...req.body,
        userId: req.user?.id
      };

      if (!applicationData.userId) {
        res.status(401).json({ error: 'User authentication required' });
        return;
      }

      const partner = await this.partnerService.applyAsPartner(applicationData);
      
      res.status(201).json({
        success: true,
        data: partner,
        message: 'Partner application submitted successfully'
      });

    } catch (error) {
      logger.error('Error in applyAsPartner:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to submit partner application'
      });
    }
  };

  // POST /api/partners/:id/approve - 파트너 승인/거절 (관리자용)
  approvePartner = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { approved, adminNotes } = req.body;

      if (!req.user?.hasRole('admin')) {
        res.status(403).json({ error: 'Admin access required' });
        return;
      }

      if (typeof approved !== 'boolean') {
        res.status(400).json({ error: 'approved field must be a boolean' });
        return;
      }

      const partner = await this.partnerService.approvePartner(id, approved, adminNotes);
      
      res.json({
        success: true,
        data: partner,
        message: `Partner ${approved ? 'approved' : 'rejected'} successfully`
      });

    } catch (error) {
      logger.error('Error in approvePartner:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to process partner approval'
      });
    }
  };

  // GET /api/partners/:id - 파트너 조회
  getPartner = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      
      const partner = await this.partnerService.getPartner(id);
      
      if (!partner) {
        res.status(404).json({ error: 'Partner not found' });
        return;
      }

      // 본인이거나 관리자만 조회 가능
      if (!req.user?.hasRole('admin') && 
          (!req.user?.hasRole('partner') || req.user.partner?.id !== id)) {
        res.status(403).json({ error: 'Not authorized to view this partner' });
        return;
      }

      res.json({
        success: true,
        data: partner
      });

    } catch (error) {
      logger.error('Error in getPartner:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch partner'
      });
    }
  };

  // GET /api/partners - 파트너 목록 조회 (관리자용)
  getPartners = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user?.hasRole('admin')) {
        res.status(403).json({ error: 'Admin access required' });
        return;
      }

      const filters: PartnerFilters = {
        status: req.query.status as any,
        tier: req.query.tier as any,
        isActive: req.query.isActive ? req.query.isActive === 'true' : undefined,
        minCommissionEarned: req.query.minCommissionEarned ? Number(req.query.minCommissionEarned) : undefined,
        maxCommissionEarned: req.query.maxCommissionEarned ? Number(req.query.maxCommissionEarned) : undefined,
        registeredAfter: req.query.registeredAfter ? new Date(req.query.registeredAfter as string) : undefined,
        registeredBefore: req.query.registeredBefore ? new Date(req.query.registeredBefore as string) : undefined,
        search: req.query.search as string,
        sortBy: req.query.sortBy as any,
        sortOrder: req.query.sortOrder as any,
        page: req.query.page ? Number(req.query.page) : undefined,
        limit: req.query.limit ? Number(req.query.limit) : undefined
      };

      const result = await this.partnerService.getPartners(filters);
      
      res.json({
        success: true,
        data: result
      });

    } catch (error) {
      logger.error('Error in getPartners:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch partners'
      });
    }
  };

  // PUT /api/partners/:id - 파트너 정보 수정
  updatePartner = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const updateData: UpdatePartnerRequest = req.body;

      // 본인이거나 관리자만 수정 가능
      if (!req.user?.hasRole('admin') && 
          (!req.user?.hasRole('partner') || req.user.partner?.id !== id)) {
        res.status(403).json({ error: 'Not authorized to update this partner' });
        return;
      }

      // 일반 파트너는 상태/티어 변경 불가
      if (!req.user?.hasRole('admin')) {
        delete updateData.status;
        delete updateData.tier;
      }

      const partner = await this.partnerService.updatePartner(id, updateData);
      
      res.json({
        success: true,
        data: partner
      });

    } catch (error) {
      logger.error('Error in updatePartner:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update partner'
      });
    }
  };

  // POST /api/partners/:id/referral-link - 추천 링크 생성
  generateReferralLink = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const params: Omit<ReferralLinkParams, 'partnerId'> = req.body;

      // 본인만 추천 링크 생성 가능
      if (!req.user?.hasRole('partner') || req.user.partner?.id !== id) {
        res.status(403).json({ error: 'Not authorized to generate referral link for this partner' });
        return;
      }

      const referralLink = await this.partnerService.generateReferralLink({
        ...params,
        partnerId: id
      });
      
      res.json({
        success: true,
        data: {
          referralLink,
          partnerId: id,
          ...params
        }
      });

    } catch (error) {
      logger.error('Error in generateReferralLink:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate referral link'
      });
    }
  };

  // POST /api/partners/track-click - 클릭 추적
  trackClick = async (req: Request, res: Response): Promise<void> => {
    try {
      const { referralCode } = req.body;
      
      if (!referralCode) {
        res.status(400).json({ error: 'Referral code is required' });
        return;
      }

      const trackingData = {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        utm_source: req.query.utm_source,
        utm_medium: req.query.utm_medium,
        utm_campaign: req.query.utm_campaign,
        utm_content: req.query.utm_content,
        timestamp: new Date()
      };

      await this.partnerService.trackClick(referralCode, trackingData);
      
      res.json({
        success: true,
        message: 'Click tracked successfully'
      });

    } catch (error) {
      logger.error('Error in trackClick:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to track click'
      });
    }
  };

  // GET /api/partners/:id/commissions - 파트너 커미션 내역 조회
  getCommissions = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      // 본인이거나 관리자만 조회 가능
      if (!req.user?.hasRole('admin') && 
          (!req.user?.hasRole('partner') || req.user.partner?.id !== id)) {
        res.status(403).json({ error: 'Not authorized to view these commissions' });
        return;
      }

      const filters: CommissionFilters = {
        partnerId: id,
        status: req.query.status as any,
        productId: req.query.productId as string,
        sellerId: req.query.sellerId as string,
        dateFrom: req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined,
        dateTo: req.query.dateTo ? new Date(req.query.dateTo as string) : undefined,
        minAmount: req.query.minAmount ? Number(req.query.minAmount) : undefined,
        maxAmount: req.query.maxAmount ? Number(req.query.maxAmount) : undefined,
        referralCode: req.query.referralCode as string,
        sortBy: req.query.sortBy as any,
        sortOrder: req.query.sortOrder as any,
        page: req.query.page ? Number(req.query.page) : undefined,
        limit: req.query.limit ? Number(req.query.limit) : undefined
      };

      const result = await this.partnerService.getCommissions(filters);
      
      res.json({
        success: true,
        data: result
      });

    } catch (error) {
      logger.error('Error in getCommissions:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch commissions'
      });
    }
  };

  // GET /api/partners/:id/stats - 파트너 성과 통계
  getPartnerStats = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const period = req.query.period as 'week' | 'month' | 'quarter' | 'year' | undefined;

      // 본인이거나 관리자만 조회 가능
      if (!req.user?.hasRole('admin') && 
          (!req.user?.hasRole('partner') || req.user.partner?.id !== id)) {
        res.status(403).json({ error: 'Not authorized to view these stats' });
        return;
      }

      const stats = await this.partnerService.getPartnerStats(id, period);
      
      res.json({
        success: true,
        data: stats
      });

    } catch (error) {
      logger.error('Error in getPartnerStats:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch partner stats'
      });
    }
  };

  // POST /api/partners/update-tiers - 파트너 티어 업데이트 (관리자용, 월별 실행)
  updatePartnerTiers = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user?.hasRole('admin')) {
        res.status(403).json({ error: 'Admin access required' });
        return;
      }

      await this.partnerService.updatePartnerTiers();
      
      res.json({
        success: true,
        message: 'Partner tiers updated successfully'
      });

    } catch (error) {
      logger.error('Error in updatePartnerTiers:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update partner tiers'
      });
    }
  };

  // GET /api/partners/stats/overview - 전체 파트너 통계 (관리자용)
  getOverallStats = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user?.hasRole('admin')) {
        res.status(403).json({ error: 'Admin access required' });
        return;
      }

      const stats = await this.partnerService.getOverallStats();
      
      res.json({
        success: true,
        data: stats
      });

    } catch (error) {
      logger.error('Error in getOverallStats:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch overall stats'
      });
    }
  };

  // GET /api/partners/me - 현재 로그인한 사용자의 파트너 정보
  getMyPartnerInfo = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user?.hasRole('partner')) {
        res.status(403).json({ error: 'Partner access required' });
        return;
      }

      const partnerId = req.user.partner?.id;
      if (!partnerId) {
        res.status(404).json({ error: 'Partner profile not found' });
        return;
      }

      const partner = await this.partnerService.getPartner(partnerId);
      
      if (!partner) {
        res.status(404).json({ error: 'Partner not found' });
        return;
      }

      res.json({
        success: true,
        data: partner
      });

    } catch (error) {
      logger.error('Error in getMyPartnerInfo:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch partner info'
      });
    }
  };

  // GET /api/partners/me/dashboard - 파트너 대시보드 데이터
  getPartnerDashboard = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user?.hasRole('partner')) {
        res.status(403).json({ error: 'Partner access required' });
        return;
      }

      const partnerId = req.user.partner?.id;
      if (!partnerId) {
        res.status(404).json({ error: 'Partner profile not found' });
        return;
      }

      const [partner, stats, recentCommissions] = await Promise.all([
        this.partnerService.getPartner(partnerId),
        this.partnerService.getPartnerStats(partnerId, 'month'),
        this.partnerService.getCommissions({
          partnerId,
          sortBy: 'createdAt',
          sortOrder: 'desc',
          limit: 10
        })
      ]);

      res.json({
        success: true,
        data: {
          partner,
          stats,
          recentCommissions: recentCommissions.commissions
        }
      });

    } catch (error) {
      logger.error('Error in getPartnerDashboard:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch partner dashboard'
      });
    }
  };
}

export default PartnerController;