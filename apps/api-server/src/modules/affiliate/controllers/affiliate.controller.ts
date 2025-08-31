import { Request, Response, NextFunction } from 'express';
import { AffiliateService } from '../services/affiliate.service';
import {
  createAffiliateSchema,
  createAffiliateLinkSchema,
  trackClickSchema,
  trackConversionSchema,
  getAffiliateStatsSchema,
  getAffiliateUserSchema
} from '../validators/affiliate.validator';
import { ApiResponse } from '../dto/response.dto';

export class AffiliateController {
  private affiliateService: AffiliateService;

  constructor() {
    this.affiliateService = new AffiliateService();
  }

  /**
   * POST /api/v1/affiliate/create
   * Create a new affiliate user
   */
  createAffiliateUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Validate request body
      const { error, value } = createAffiliateSchema.validate(req.body);
      if (error) {
        res.status(400).json({
          success: false,
          error: error.details[0].message,
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Create affiliate user
      const result = await this.affiliateService.createAffiliateUser(value);

      const response: ApiResponse = {
        success: true,
        data: result,
        message: 'Affiliate user created successfully',
        timestamp: new Date().toISOString()
      };

      res.status(201).json(response);
    } catch (error: any) {
      const response: ApiResponse = {
        success: false,
        error: error.message || 'Failed to create affiliate user',
        timestamp: new Date().toISOString()
      };
      res.status(error.message?.includes('already') ? 409 : 500).json(response);
    }
  };

  /**
   * GET /api/v1/affiliate/user/:userId?
   * Get affiliate user by userId or referralCode
   */
  getAffiliateUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const params = {
        userId: req.params.userId,
        referralCode: req.query.referralCode as string
      };

      // Validate parameters
      const { error, value } = getAffiliateUserSchema.validate(params);
      if (error) {
        res.status(400).json({
          success: false,
          error: error.details[0].message,
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Get affiliate user
      const result = await this.affiliateService.getAffiliateUser(
        value.userId,
        value.referralCode
      );

      if (!result) {
        res.status(404).json({
          success: false,
          error: 'Affiliate user not found',
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
        error: error.message || 'Failed to get affiliate user',
        timestamp: new Date().toISOString()
      };
      res.status(500).json(response);
    }
  };

  /**
   * POST /api/v1/affiliate/generate-link
   * Generate affiliate tracking link
   */
  generateAffiliateLink = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Validate request body
      const { error, value } = createAffiliateLinkSchema.validate(req.body);
      if (error) {
        res.status(400).json({
          success: false,
          error: error.details[0].message,
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Generate link
      const result = await this.affiliateService.generateAffiliateLink(value);

      const response: ApiResponse = {
        success: true,
        data: result,
        message: 'Affiliate link generated successfully',
        timestamp: new Date().toISOString()
      };

      res.json(response);
    } catch (error: any) {
      const response: ApiResponse = {
        success: false,
        error: error.message || 'Failed to generate affiliate link',
        timestamp: new Date().toISOString()
      };
      res.status(error.message?.includes('not found') ? 404 : 500).json(response);
    }
  };

  /**
   * POST /api/v1/affiliate/track-click
   * Track affiliate click
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
      const result = await this.affiliateService.trackClick(value);

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
   * POST /api/v1/affiliate/track-conversion
   * Track affiliate conversion
   */
  trackConversion = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Get session from cookie or request
      const sessionId = req.body.sessionId || req.cookies?.aff_track;
      
      if (!sessionId) {
        res.status(400).json({
          success: false,
          error: 'No affiliate session found',
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
      const result = await this.affiliateService.trackConversion(value);

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
      if (error.message?.includes('No affiliate session')) statusCode = 400;
      else if (error.message?.includes('expired')) statusCode = 400;
      else if (error.message?.includes('Invalid')) statusCode = 400;
      
      res.status(statusCode).json(response);
    }
  };

  /**
   * GET /api/v1/affiliate/stats
   * Get affiliate statistics
   */
  getAffiliateStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Parse query parameters
      const params = {
        affiliateUserId: req.query.affiliateUserId as string,
        startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
        endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
        groupBy: req.query.groupBy as 'day' | 'week' | 'month'
      };

      // Validate parameters
      const { error, value } = getAffiliateStatsSchema.validate(params);
      if (error) {
        res.status(400).json({
          success: false,
          error: error.details[0].message,
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Get statistics
      const result = await this.affiliateService.getAffiliateStats(value);

      const response: ApiResponse = {
        success: true,
        data: result,
        timestamp: new Date().toISOString()
      };

      res.json(response);
    } catch (error: any) {
      const response: ApiResponse = {
        success: false,
        error: error.message || 'Failed to get affiliate stats',
        timestamp: new Date().toISOString()
      };
      res.status(500).json(response);
    }
  };
}