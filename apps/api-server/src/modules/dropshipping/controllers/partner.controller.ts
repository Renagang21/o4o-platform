import { Response } from 'express';
import { BaseController } from '../../../common/base.controller.js';
import { PartnerService } from '../services/PartnerService.js';
import { PartnerApplicationDto, UpdatePartnerProfileDto } from '../dto/index.js';
import logger from '../../../utils/logger.js';
import type { AuthRequest } from '../../../common/middleware/auth.middleware.js';

/**
 * PartnerController
 * NextGen V2 - Dropshipping Module
 * Handles partner operations
 */
export class PartnerController extends BaseController {
  static async createPartner(req: AuthRequest, res: Response): Promise<any> {
    try {
      if (!req.user) {
        return BaseController.unauthorized(res, 'Not authenticated');
      }

      const data = req.body as PartnerApplicationDto;
      const partnerService = PartnerService.getInstance();

      // Map PartnerApplicationDto to CreatePartnerRequest
      const partner = await partnerService.applyAsPartner({
        userId: req.user.id,
        businessName: data.profile?.bio || '',
        website: data.profile?.website,
        socialMedia: data.profile?.socialMedia,
        marketingChannels: data.profile?.audience?.interests,
        expectedMonthlyTraffic: data.profile?.audience?.size,
        targetAudience: data.profile?.audience?.demographics,
        bio: data.profile?.bio,
        profileImage: undefined
      });

      return BaseController.ok(res, {
        message: 'Partner application submitted successfully',
        partner
      });
    } catch (error: any) {
      logger.error('[PartnerController.createPartner] Error', {
        error: error.message,
        userId: req.user?.id,
      });
      return BaseController.error(res, error);
    }
  }

  static async getPartner(req: AuthRequest, res: Response): Promise<any> {
    try {
      const { id } = req.params;
      const partnerService = PartnerService.getInstance();

      const partner = await partnerService.findById(id);

      if (!partner) {
        return BaseController.notFound(res, 'Partner not found');
      }

      return BaseController.ok(res, { partner });
    } catch (error: any) {
      logger.error('[PartnerController.getPartner] Error', {
        error: error.message,
        partnerId: req.params.id,
      });
      return BaseController.error(res, error);
    }
  }

  static async getMyPartnerProfile(req: AuthRequest, res: Response): Promise<any> {
    try {
      if (!req.user) {
        return BaseController.unauthorized(res, 'Not authenticated');
      }

      const partnerService = PartnerService.getInstance();
      const partner = await partnerService.getByUserId(req.user.id);

      if (!partner) {
        return BaseController.notFound(res, 'Partner profile not found');
      }

      return BaseController.ok(res, { partner });
    } catch (error: any) {
      logger.error('[PartnerController.getMyPartnerProfile] Error', {
        error: error.message,
        userId: req.user?.id,
      });
      return BaseController.error(res, error);
    }
  }

  static async updatePartner(req: AuthRequest, res: Response): Promise<any> {
    try {
      if (!req.user) {
        return BaseController.unauthorized(res, 'Not authenticated');
      }

      const { id } = req.params;
      const data = req.body as UpdatePartnerProfileDto;
      const partnerService = PartnerService.getInstance();

      const partner = await partnerService.updatePartner(id, {
        // Map UpdatePartnerProfileDto fields to UpdatePartnerRequest
        // Note: UpdatePartnerRequest expects different fields, so we store in metadata
        ...data
      } as any);

      return BaseController.ok(res, {
        message: 'Partner profile updated successfully',
        partner
      });
    } catch (error: any) {
      logger.error('[PartnerController.updatePartner] Error', {
        error: error.message,
        partnerId: req.params.id,
      });
      return BaseController.error(res, error);
    }
  }

  static async listPartners(req: AuthRequest, res: Response): Promise<any> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const status = req.query.status as any;
      const tier = req.query.tier as any;
      const search = req.query.search as string;

      const partnerService = PartnerService.getInstance();

      const result = await partnerService.getPartners({
        status,
        tier,
        search,
        page,
        limit
      });

      return BaseController.okPaginated(res, result.partners, {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
      });
    } catch (error: any) {
      logger.error('[PartnerController.listPartners] Error', {
        error: error.message,
      });
      return BaseController.error(res, error);
    }
  }
}
