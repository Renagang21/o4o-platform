import { Request, Response, NextFunction } from 'express';
import { PartnerService } from '../services/partner.service';
import {
  createPartnerSchema,
  createPartnerLinkSchema,
  trackClickSchema,
  trackConversionSchema,
  getPartnerStatsSchema,
  getPartnerUserSchema
} from '../validators/partner.validator';
import { ApiResponse } from '../dto/response.dto';

export class PartnerController {
  private partnerService: PartnerService;

  constructor() {
    this.partnerService = new PartnerService();
  }

  /**
   * POST /api/v1/partner/create
   * Create a new partner user
   */
  createPartnerUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Validate request body
      const { error, value } = createPartnerSchema.validate(req.body);
      if (error) {
        res.status(400).json({
          success: false,
          error: error.details[0].message,
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Create partner user
      const result = await this.partnerService.createPartnerUser(value);

      const response: ApiResponse = {
        success: true,
        data: result,
        message: 'Partner user created successfully',
        timestamp: new Date().toISOString()
      };

      res.status(201).json(response);
    } catch (error: any) {
      const response: ApiResponse = {
        success: false,
        error: error.message || 'Failed to create partner user',
        timestamp: new Date().toISOString()
      };
      res.status(error.message?.includes('already') ? 409 : 500).json(response);
    }
  };

  /**
   * GET /api/v1/partner/user/:userId?
   * Get partner user by userId or referralCode
   */
  getPartnerUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const params = {
        userId: req.params.userId,
        referralCode: req.query.referralCode as string
      };

      // Validate parameters
      const { error, value } = getPartnerUserSchema.validate(params);
      if (error) {
        res.status(400).json({
          success: false,
          error: error.details[0].message,
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Get partner user
      const result = await this.partnerService.getPartnerUser(
        value.userId,
        value.referralCode
      );

      if (!result) {
        res.status(404).json({
          success: false,
          error: 'Partner user not found',
          timestamp: new Date().toISOString()
        });
        return;
      }

      const response: ApiResponse = {
        success: true,
        data: result,
        timestamp: new Date().toISOString()
      };

      res.json(response);
    } catch (error: any) {
      const response: ApiResponse = {
        success: false,
        error: error.message || 'Failed to get partner user',
        timestamp: new Date().toISOString()
      };
      res.status(500).json(response);
    }
  };

  /**
   * POST /api/v1/partner/generate-link
   * Generate partner tracking link
   */
  generatePartnerLink = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Validate request body
      const { error, value } = createPartnerLinkSchema.validate(req.body);
      if (error) {
        res.status(400).json({
          success: false,
          error: error.details[0].message,
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Generate link
      const result = await this.partnerService.generatePartnerLink(value);

      const response: ApiResponse = {
        success: true,
        data: result,
        message: 'Partner link generated successfully',
        timestamp: new Date().toISOString()
      };

      res.json(response);
    } catch (error: any) {
      const response: ApiResponse = {
        success: false,
        error: error.message || 'Failed to generate partner link',
        timestamp: new Date().toISOString()
      };
      res.status(error.message?.includes('not found') ? 404 : 500).json(response);
    }
  };

  /**
   * POST /api/v1/partner/track-click
   * Track partner click
   */
  trackClick = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Get IP address from request
      const ipAddress = req.ip || req.socket.remoteAddress || '';
      const userAgent = req.headers['user-agent'] || '';

      // Merge with request body
      const clickData = {
        ...req.body,
        ipAddress: req.body.ipAddress || ipAddress,
        userAgent: req.body.userAgent || userAgent
      };

      // Validate request data
      const { error, value } = trackClickSchema.validate(clickData);
      if (error) {
        res.status(400).json({
          success: false,
          error: error.details[0].message,
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Track click
      const result = await this.partnerService.trackClick(value);

      // Set tracking cookie (30 days)
      res.cookie('aff_track', result.sessionId, {
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax'
      });

      const response: ApiResponse = {
        success: true,
        data: result,
        message: 'Click tracked successfully',
        timestamp: new Date().toISOString()
      };

      res.json(response);
    } catch (error: any) {
      const response: ApiResponse = {
        success: false,
        error: error.message || 'Failed to track click',
        timestamp: new Date().toISOString()
      };
      res.status(error.message?.includes('Invalid') ? 400 : 500).json(response);
    }
  };

  /**
   * POST /api/v1/partner/track-conversion
   * Track partner conversion
   */
  trackConversion = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Get session from cookie or request
      const sessionId = req.body.sessionId || req.cookies?.aff_track;
      
      if (!sessionId) {
        res.status(400).json({
          success: false,
          error: 'No partner session found',
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Get IP and user agent
      const ipAddress = req.ip || req.socket.remoteAddress || '';
      const userAgent = req.headers['user-agent'] || '';

      // Merge with request body
      const conversionData = {
        ...req.body,
        sessionId,
        ipAddress: req.body.ipAddress || ipAddress,
        userAgent: req.body.userAgent || userAgent
      };

      // Validate request data
      const { error, value } = trackConversionSchema.validate(conversionData);
      if (error) {
        res.status(400).json({
          success: false,
          error: error.details[0].message,
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Track conversion
      const result = await this.partnerService.trackConversion(value);

      // Clear tracking cookie after conversion
      if (result.success) {
        res.clearCookie('aff_track');
      }

      const response: ApiResponse = {
        success: true,
        data: result,
        message: 'Conversion tracked successfully',
        timestamp: new Date().toISOString()
      };

      res.json(response);
    } catch (error: any) {
      const response: ApiResponse = {
        success: false,
        error: error.message || 'Failed to track conversion',
        timestamp: new Date().toISOString()
      };
      
      let statusCode = 500;
      if (error.message?.includes('No partner session')) statusCode = 400;
      else if (error.message?.includes('expired')) statusCode = 400;
      else if (error.message?.includes('Invalid')) statusCode = 400;
      
      res.status(statusCode).json(response);
    }
  };

  /**
   * GET /api/v1/partner/stats
   * Get partner statistics
   */
  getPartnerStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Parse query parameters
      const params = {
        partnerUserId: req.query.partnerUserId as string,
        startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
        endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
        groupBy: req.query.groupBy as 'day' | 'week' | 'month'
      };

      // Validate parameters
      const { error, value } = getPartnerStatsSchema.validate(params);
      if (error) {
        res.status(400).json({
          success: false,
          error: error.details[0].message,
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Get statistics
      const result = await this.partnerService.getPartnerStats(value);

      const response: ApiResponse = {
        success: true,
        data: result,
        timestamp: new Date().toISOString()
      };

      res.json(response);
    } catch (error: any) {
      const response: ApiResponse = {
        success: false,
        error: error.message || 'Failed to get partner stats',
        timestamp: new Date().toISOString()
      };
      res.status(500).json(response);
    }
  };
}