import { Request, Response } from 'express';
import TrackingService, { RecordClickRequest, ClickFilters } from '../services/TrackingService.js';
import AttributionService, { CreateConversionRequest, ConversionFilters } from '../services/AttributionService.js';
import CommissionEngine, { CreateCommissionRequest, PolicyFilters, CommissionFilters } from '../services/CommissionEngine.js';
import logger from '../utils/logger.js';

/**
 * TrackingController
 *
 * Handles API endpoints for:
 * - Click tracking
 * - Conversion events
 * - Commission management
 * - Policy management
 */
export class TrackingController {
  private trackingService: TrackingService;
  private attributionService: AttributionService;
  private commissionEngine: CommissionEngine;

  constructor() {
    this.trackingService = new TrackingService();
    this.attributionService = new AttributionService();
    this.commissionEngine = new CommissionEngine();
  }

  // ===== CLICK TRACKING =====

  /**
   * POST /api/v1/tracking/click
   * Record a referral click (public endpoint, rate-limited)
   */
  recordClick = async (req: Request, res: Response): Promise<void> => {
    try {
      const clickData: RecordClickRequest = {
        referralCode: req.body.referralCode || req.query.ref,
        productId: req.body.productId || req.query.product,
        referralLink: req.body.referralLink,
        campaign: req.body.campaign || req.query.utm_campaign,
        medium: req.body.medium || req.query.utm_medium,
        source: req.body.source || req.query.utm_source,
        // Request metadata
        ipAddress: req.ip || req.socket.remoteAddress,
        userAgent: req.get('User-Agent'),
        referer: req.get('Referer') || req.get('Referrer'),
        sessionId: req.body.sessionId,
        fingerprint: req.body.fingerprint
      };

      if (!clickData.referralCode) {
        res.status(400).json({
          success: false,
          error: 'Referral code is required'
        });
        return;
      }

      const click = await this.trackingService.recordClick(clickData);

      res.status(201).json({
        success: true,
        data: {
          clickId: click.id,
          status: click.status,
          isValid: click.isValid()
        },
        message: 'Click recorded successfully'
      });

    } catch (error) {
      logger.error('Error in recordClick:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to record click'
      });
    }
  };

  /**
   * GET /api/v1/tracking/clicks
   * Get clicks with filters (authenticated)
   */
  getClicks = async (req: Request, res: Response): Promise<void> => {
    try {
      // Partner can only see their own clicks unless admin
      const partnerId = req.user?.hasRole('admin')
        ? (req.query.partnerId as string)
        : req.user?.partner?.id;

      if (!partnerId && !req.user?.hasRole('admin')) {
        res.status(403).json({ error: 'Partner access required' });
        return;
      }

      const filters: ClickFilters = {
        partnerId,
        referralCode: req.query.referralCode as string,
        status: req.query.status as any,
        dateFrom: req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined,
        dateTo: req.query.dateTo ? new Date(req.query.dateTo as string) : undefined,
        hasConverted: req.query.hasConverted ? req.query.hasConverted === 'true' : undefined,
        sortBy: req.query.sortBy as any,
        sortOrder: req.query.sortOrder as any,
        page: req.query.page ? Number(req.query.page) : undefined,
        limit: req.query.limit ? Number(req.query.limit) : undefined
      };

      const result = await this.trackingService.getClicks(filters);

      res.json({
        success: true,
        data: result
      });

    } catch (error) {
      logger.error('Error in getClicks:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch clicks'
      });
    }
  };

  /**
   * GET /api/v1/tracking/clicks/:id
   * Get click by ID (authenticated)
   */
  getClick = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      const click = await this.trackingService.getClick(id);

      if (!click) {
        res.status(404).json({ error: 'Click not found' });
        return;
      }

      // Partner can only see their own clicks unless admin
      if (!req.user?.hasRole('admin') && click.partnerId !== req.user?.partner?.id) {
        res.status(403).json({ error: 'Not authorized to view this click' });
        return;
      }

      res.json({
        success: true,
        data: click
      });

    } catch (error) {
      logger.error('Error in getClick:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch click'
      });
    }
  };

  /**
   * GET /api/v1/tracking/clicks/stats
   * Get click stats for partner (authenticated)
   */
  getClickStats = async (req: Request, res: Response): Promise<void> => {
    try {
      // Partner can only see their own stats unless admin
      const partnerId = req.user?.hasRole('admin')
        ? (req.query.partnerId as string)
        : req.user?.partner?.id;

      if (!partnerId) {
        res.status(403).json({ error: 'Partner access required' });
        return;
      }

      const dateFrom = req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined;
      const dateTo = req.query.dateTo ? new Date(req.query.dateTo as string) : undefined;

      const stats = await this.trackingService.getClickStats(partnerId, dateFrom, dateTo);

      res.json({
        success: true,
        data: stats
      });

    } catch (error) {
      logger.error('Error in getClickStats:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch click stats'
      });
    }
  };

  // ===== CONVERSION TRACKING =====

  /**
   * POST /api/v1/tracking/conversion
   * Create conversion event (internal/admin only)
   */
  createConversion = async (req: Request, res: Response): Promise<void> => {
    try {
      // Admin-only endpoint
      if (!req.user?.hasRole('admin')) {
        res.status(403).json({ error: 'Admin access required' });
        return;
      }

      const conversionData: CreateConversionRequest = req.body;

      const conversion = await this.attributionService.createConversion(conversionData);

      res.status(201).json({
        success: true,
        data: conversion,
        message: 'Conversion created successfully'
      });

    } catch (error) {
      logger.error('Error in createConversion:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create conversion'
      });
    }
  };

  /**
   * GET /api/v1/tracking/conversions
   * Get conversions with filters (authenticated)
   */
  getConversions = async (req: Request, res: Response): Promise<void> => {
    try {
      // Partner can only see their own conversions unless admin
      const partnerId = req.user?.hasRole('admin')
        ? (req.query.partnerId as string)
        : req.user?.partner?.id;

      if (!partnerId && !req.user?.hasRole('admin')) {
        res.status(403).json({ error: 'Partner access required' });
        return;
      }

      const filters: ConversionFilters = {
        partnerId,
        orderId: req.query.orderId as string,
        referralCode: req.query.referralCode as string,
        status: req.query.status as any,
        conversionType: req.query.conversionType as any,
        dateFrom: req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined,
        dateTo: req.query.dateTo ? new Date(req.query.dateTo as string) : undefined,
        minAmount: req.query.minAmount ? Number(req.query.minAmount) : undefined,
        maxAmount: req.query.maxAmount ? Number(req.query.maxAmount) : undefined,
        isNewCustomer: req.query.isNewCustomer ? req.query.isNewCustomer === 'true' : undefined,
        sortBy: req.query.sortBy as any,
        sortOrder: req.query.sortOrder as any,
        page: req.query.page ? Number(req.query.page) : undefined,
        limit: req.query.limit ? Number(req.query.limit) : undefined
      };

      const result = await this.attributionService.getConversions(filters);

      res.json({
        success: true,
        data: result
      });

    } catch (error) {
      logger.error('Error in getConversions:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch conversions'
      });
    }
  };

  /**
   * GET /api/v1/tracking/conversions/:id
   * Get conversion by ID (authenticated)
   */
  getConversion = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      const conversion = await this.attributionService.getConversion(id);

      if (!conversion) {
        res.status(404).json({ error: 'Conversion not found' });
        return;
      }

      // Partner can only see their own conversions unless admin
      if (!req.user?.hasRole('admin') && conversion.partnerId !== req.user?.partner?.id) {
        res.status(403).json({ error: 'Not authorized to view this conversion' });
        return;
      }

      res.json({
        success: true,
        data: conversion
      });

    } catch (error) {
      logger.error('Error in getConversion:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch conversion'
      });
    }
  };

  /**
   * POST /api/v1/tracking/conversions/:id/confirm
   * Confirm conversion (admin only)
   */
  confirmConversion = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user?.hasRole('admin')) {
        res.status(403).json({ error: 'Admin access required' });
        return;
      }

      const { id } = req.params;

      const conversion = await this.attributionService.confirmConversion(id);

      res.json({
        success: true,
        data: conversion,
        message: 'Conversion confirmed successfully'
      });

    } catch (error) {
      logger.error('Error in confirmConversion:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to confirm conversion'
      });
    }
  };

  /**
   * POST /api/v1/tracking/conversions/:id/cancel
   * Cancel conversion (admin only)
   */
  cancelConversion = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user?.hasRole('admin')) {
        res.status(403).json({ error: 'Admin access required' });
        return;
      }

      const { id } = req.params;

      const conversion = await this.attributionService.cancelConversion(id);

      res.json({
        success: true,
        data: conversion,
        message: 'Conversion cancelled successfully'
      });

    } catch (error) {
      logger.error('Error in cancelConversion:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to cancel conversion'
      });
    }
  };

  /**
   * POST /api/v1/tracking/conversions/:id/refund
   * Process refund on conversion (admin only)
   */
  processRefund = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user?.hasRole('admin')) {
        res.status(403).json({ error: 'Admin access required' });
        return;
      }

      const { id } = req.params;
      const { refundAmount, refundQuantity } = req.body;

      if (!refundAmount || refundAmount <= 0) {
        res.status(400).json({ error: 'Valid refund amount is required' });
        return;
      }

      const conversion = await this.attributionService.processRefund(
        id,
        refundAmount,
        refundQuantity
      );

      res.json({
        success: true,
        data: conversion,
        message: 'Refund processed successfully'
      });

    } catch (error) {
      logger.error('Error in processRefund:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to process refund'
      });
    }
  };

  /**
   * GET /api/v1/tracking/conversions/stats
   * Get conversion stats for partner (authenticated)
   */
  getConversionStats = async (req: Request, res: Response): Promise<void> => {
    try {
      // Partner can only see their own stats unless admin
      const partnerId = req.user?.hasRole('admin')
        ? (req.query.partnerId as string)
        : req.user?.partner?.id;

      if (!partnerId) {
        res.status(403).json({ error: 'Partner access required' });
        return;
      }

      const dateFrom = req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined;
      const dateTo = req.query.dateTo ? new Date(req.query.dateTo as string) : undefined;

      const stats = await this.attributionService.getConversionStats(partnerId, dateFrom, dateTo);

      res.json({
        success: true,
        data: stats
      });

    } catch (error) {
      logger.error('Error in getConversionStats:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch conversion stats'
      });
    }
  };

  // ===== COMMISSION MANAGEMENT =====

  /**
   * POST /api/v1/commissions
   * Create commission from conversion (admin only)
   */
  createCommission = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user?.hasRole('admin')) {
        res.status(403).json({ error: 'Admin access required' });
        return;
      }

      const commissionData: CreateCommissionRequest = req.body;

      const commission = await this.commissionEngine.createCommission(commissionData);

      res.status(201).json({
        success: true,
        data: commission,
        message: 'Commission created successfully'
      });

    } catch (error) {
      logger.error('Error in createCommission:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create commission'
      });
    }
  };

  /**
   * GET /api/v1/commissions
   * Get commissions with filters (authenticated)
   */
  getCommissions = async (req: Request, res: Response): Promise<void> => {
    try {
      // Partner can only see their own commissions unless admin
      const partnerId = req.user?.hasRole('admin')
        ? (req.query.partnerId as string)
        : req.user?.partner?.id;

      if (!partnerId && !req.user?.hasRole('admin')) {
        res.status(403).json({ error: 'Partner access required' });
        return;
      }

      const filters: CommissionFilters = {
        partnerId,
        status: req.query.status as any,
        dateFrom: req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined,
        dateTo: req.query.dateTo ? new Date(req.query.dateTo as string) : undefined,
        minAmount: req.query.minAmount ? Number(req.query.minAmount) : undefined,
        maxAmount: req.query.maxAmount ? Number(req.query.maxAmount) : undefined,
        sortBy: req.query.sortBy as any,
        sortOrder: req.query.sortOrder as any,
        page: req.query.page ? Number(req.query.page) : undefined,
        limit: req.query.limit ? Number(req.query.limit) : undefined
      };

      const result = await this.commissionEngine.getCommissions(filters);

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

  /**
   * POST /api/v1/commissions/:id/confirm
   * Confirm commission (admin only)
   */
  confirmCommission = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user?.hasRole('admin')) {
        res.status(403).json({ error: 'Admin access required' });
        return;
      }

      const { id } = req.params;

      const commission = await this.commissionEngine.confirmCommission(id);

      res.json({
        success: true,
        data: commission,
        message: 'Commission confirmed successfully'
      });

    } catch (error) {
      logger.error('Error in confirmCommission:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to confirm commission'
      });
    }
  };

  /**
   * POST /api/v1/commissions/:id/cancel
   * Cancel commission (admin only)
   */
  cancelCommission = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user?.hasRole('admin')) {
        res.status(403).json({ error: 'Admin access required' });
        return;
      }

      const { id } = req.params;
      const { reason } = req.body;

      const commission = await this.commissionEngine.cancelCommission(id, reason);

      res.json({
        success: true,
        data: commission,
        message: 'Commission cancelled successfully'
      });

    } catch (error) {
      logger.error('Error in cancelCommission:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to cancel commission'
      });
    }
  };

  /**
   * POST /api/v1/commissions/:id/adjust
   * Adjust commission amount (admin only)
   */
  adjustCommission = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user?.hasRole('admin')) {
        res.status(403).json({ error: 'Admin access required' });
        return;
      }

      const { id } = req.params;
      const { newAmount, reason } = req.body;

      if (!newAmount || newAmount < 0) {
        res.status(400).json({ error: 'Valid new amount is required' });
        return;
      }

      if (!reason) {
        res.status(400).json({ error: 'Adjustment reason is required' });
        return;
      }

      const commission = await this.commissionEngine.adjustCommission(id, newAmount, reason);

      res.json({
        success: true,
        data: commission,
        message: 'Commission adjusted successfully'
      });

    } catch (error) {
      logger.error('Error in adjustCommission:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to adjust commission'
      });
    }
  };

  /**
   * POST /api/v1/commissions/:id/pay
   * Mark commission as paid (admin only)
   */
  markAsPaid = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user?.hasRole('admin')) {
        res.status(403).json({ error: 'Admin access required' });
        return;
      }

      const { id } = req.params;
      const { paymentMethod, paymentReference } = req.body;

      if (!paymentMethod) {
        res.status(400).json({ error: 'Payment method is required' });
        return;
      }

      const commission = await this.commissionEngine.markAsPaid(id, paymentMethod, paymentReference);

      res.json({
        success: true,
        data: commission,
        message: 'Commission marked as paid successfully'
      });

    } catch (error) {
      logger.error('Error in markAsPaid:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to mark commission as paid'
      });
    }
  };

  /**
   * GET /api/v1/commissions/stats
   * Get commission stats for partner (authenticated)
   */
  getCommissionStats = async (req: Request, res: Response): Promise<void> => {
    try {
      // Partner can only see their own stats unless admin
      const partnerId = req.user?.hasRole('admin')
        ? (req.query.partnerId as string)
        : req.user?.partner?.id;

      if (!partnerId) {
        res.status(403).json({ error: 'Partner access required' });
        return;
      }

      const dateFrom = req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined;
      const dateTo = req.query.dateTo ? new Date(req.query.dateTo as string) : undefined;

      const stats = await this.commissionEngine.getCommissionStats(partnerId, dateFrom, dateTo);

      res.json({
        success: true,
        data: stats
      });

    } catch (error) {
      logger.error('Error in getCommissionStats:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch commission stats'
      });
    }
  };

  // ===== POLICY MANAGEMENT =====

  /**
   * POST /api/v1/policies
   * Create or update commission policy (admin only)
   */
  upsertPolicy = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user?.hasRole('admin')) {
        res.status(403).json({ error: 'Admin access required' });
        return;
      }

      const policyData = req.body;

      const policy = await this.commissionEngine.upsertPolicy(policyData);

      res.status(policyData.id ? 200 : 201).json({
        success: true,
        data: policy,
        message: `Policy ${policyData.id ? 'updated' : 'created'} successfully`
      });

    } catch (error) {
      logger.error('Error in upsertPolicy:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to save policy'
      });
    }
  };

  /**
   * GET /api/v1/policies
   * Get policies with filters (admin only)
   */
  getPolicies = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user?.hasRole('admin')) {
        res.status(403).json({ error: 'Admin access required' });
        return;
      }

      const filters: PolicyFilters = {
        policyType: req.query.policyType as any,
        status: req.query.status as any,
        partnerId: req.query.partnerId as string,
        productId: req.query.productId as string,
        category: req.query.category as string,
        isActive: req.query.isActive ? req.query.isActive === 'true' : undefined,
        sortBy: req.query.sortBy as any,
        sortOrder: req.query.sortOrder as any,
        page: req.query.page ? Number(req.query.page) : undefined,
        limit: req.query.limit ? Number(req.query.limit) : undefined
      };

      const result = await this.commissionEngine.getPolicies(filters);

      res.json({
        success: true,
        data: result
      });

    } catch (error) {
      logger.error('Error in getPolicies:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch policies'
      });
    }
  };
}

export default TrackingController;
