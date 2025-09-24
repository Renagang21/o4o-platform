import { Request, Response } from 'express';
import { ShippingTrackingService } from '../services/shippingTracking.service';
import { ShippingStatus, ShippingCarrier } from '../entities/ShippingTracking';
import { AuthRequest } from '../types/auth';

export class ShippingTrackingController {
  private shippingService: ShippingTrackingService;

  constructor() {
    this.shippingService = new ShippingTrackingService();
  }

  /**
   * Create shipping tracking
   */
  async createTracking(req: AuthRequest, res: Response): Promise<void> {
    try {
      const {
        orderId,
        carrier,
        trackingNumber,
        shippingAddress,
        estimatedDeliveryDate,
        shippingCost,
        weight,
        dimensions
      } = req.body;

      if (!orderId || !carrier || !trackingNumber) {
        res.status(400).json({
          error: 'Order ID, carrier, and tracking number are required'
        });
        return;
      }

      const tracking = await this.shippingService.createShippingTracking({
        orderId,
        carrier,
        trackingNumber,
        shippingAddress,
        estimatedDeliveryDate: estimatedDeliveryDate ? new Date(estimatedDeliveryDate) : undefined,
        shippingCost,
        weight,
        dimensions
      });

      res.status(201).json({
        success: true,
        message: 'Shipping tracking created successfully',
        tracking
      });
    } catch (error: any) {
      res.status(500).json({
        error: 'Failed to create shipping tracking',
        message: error.message
      });
    }
  }

  /**
   * Update tracking status
   */
  async updateStatus(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { status, location, description } = req.body;

      if (!status) {
        res.status(400).json({
          error: 'Status is required'
        });
        return;
      }

      const tracking = await this.shippingService.updateTrackingStatus(
        id,
        status,
        location,
        description
      );

      res.json({
        success: true,
        message: 'Tracking status updated successfully',
        tracking
      });
    } catch (error: any) {
      res.status(500).json({
        error: 'Failed to update tracking status',
        message: error.message
      });
    }
  }

  /**
   * Get tracking by tracking number
   */
  async getByTrackingNumber(req: Request, res: Response): Promise<void> {
    try {
      const { trackingNumber } = req.params;
      const { carrier } = req.query;

      const tracking = await this.shippingService.getTrackingByNumber(
        trackingNumber,
        carrier as ShippingCarrier
      );

      if (!tracking) {
        res.status(404).json({
          error: 'Tracking not found'
        });
        return;
      }

      res.json({
        success: true,
        tracking
      });
    } catch (error: any) {
      res.status(500).json({
        error: 'Failed to fetch tracking',
        message: error.message
      });
    }
  }

  /**
   * Get tracking by order ID
   */
  async getByOrderId(req: Request, res: Response): Promise<void> {
    try {
      const { orderId } = req.params;

      const tracking = await this.shippingService.getTrackingByOrderId(orderId);

      if (!tracking) {
        res.status(404).json({
          error: 'Tracking not found for this order'
        });
        return;
      }

      res.json({
        success: true,
        tracking
      });
    } catch (error: any) {
      res.status(500).json({
        error: 'Failed to fetch tracking',
        message: error.message
      });
    }
  }

  /**
   * Get trackings by status
   */
  async getByStatus(req: Request, res: Response): Promise<void> {
    try {
      const { status } = req.params;

      const trackings = await this.shippingService.getTrackingsByStatus(
        status as ShippingStatus
      );

      res.json({
        success: true,
        count: trackings.length,
        trackings
      });
    } catch (error: any) {
      res.status(500).json({
        error: 'Failed to fetch trackings',
        message: error.message
      });
    }
  }

  /**
   * Mark shipment as failed
   */
  async markAsFailed(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      if (!reason) {
        res.status(400).json({
          error: 'Failure reason is required'
        });
        return;
      }

      const tracking = await this.shippingService.markAsFailed(id, reason);

      res.json({
        success: true,
        message: 'Shipment marked as failed',
        tracking
      });
    } catch (error: any) {
      res.status(500).json({
        error: 'Failed to mark shipment as failed',
        message: error.message
      });
    }
  }

  /**
   * Process return shipment
   */
  async processReturn(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { returnTrackingNumber } = req.body;

      if (!returnTrackingNumber) {
        res.status(400).json({
          error: 'Return tracking number is required'
        });
        return;
      }

      const tracking = await this.shippingService.processReturn(
        id,
        returnTrackingNumber
      );

      res.json({
        success: true,
        message: 'Return shipment processed',
        tracking
      });
    } catch (error: any) {
      res.status(500).json({
        error: 'Failed to process return',
        message: error.message
      });
    }
  }

  /**
   * Get delivery statistics
   */
  async getStatistics(req: Request, res: Response): Promise<void> {
    try {
      const { startDate, endDate } = req.query;

      if (!startDate || !endDate) {
        res.status(400).json({
          error: 'Start date and end date are required'
        });
        return;
      }

      const stats = await this.shippingService.getDeliveryStatistics(
        new Date(startDate as string),
        new Date(endDate as string)
      );

      res.json({
        success: true,
        statistics: stats
      });
    } catch (error: any) {
      res.status(500).json({
        error: 'Failed to fetch statistics',
        message: error.message
      });
    }
  }

  /**
   * Batch update from carrier
   */
  async batchUpdate(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { carrier } = req.params;

      await this.shippingService.batchUpdateFromCarrier(carrier as ShippingCarrier);

      res.json({
        success: true,
        message: `Batch update for ${carrier} initiated`
      });
    } catch (error: any) {
      res.status(500).json({
        error: 'Failed to initiate batch update',
        message: error.message
      });
    }
  }
}