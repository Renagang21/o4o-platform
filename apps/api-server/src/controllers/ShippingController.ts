/**
 * Shipping Controller
 * 배송 관리 API
 */

import { Request, Response } from 'express';
import { shippingService } from '../services/shipping/ShippingService';
import { AppDataSource } from '../database/connection';
import { Order } from '../entities/Order';
import { Shipment } from '../entities/Shipment';

export class ShippingController {
  private orderRepository = AppDataSource.getRepository(Order);
  private shipmentRepository = AppDataSource.getRepository(Shipment);

  /**
   * Get shipping rates for an order
   * GET /api/v1/shipping/rates/:orderId
   */
  async getShippingRates(req: Request, res: Response) {
    try {
      const { orderId } = req.params;
      
      const rates = await shippingService.calculateShippingRates(orderId);
      
      res.json({
        success: true,
        data: rates
      });
    } catch (error: any) {
      // Error log removed
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to get shipping rates'
      });
    }
  }

  /**
   * Create shipping label
   * POST /api/v1/shipping/label
   */
  async createShippingLabel(req: Request, res: Response) {
    try {
      const { orderId, carrier } = req.body;
      
      if (!orderId || !carrier) {
        return res.status(400).json({
          success: false,
          message: 'Order ID and carrier are required'
        });
      }

      const label = await shippingService.createShippingLabel(orderId, carrier);
      
      res.json({
        success: true,
        data: label
      });
    } catch (error: any) {
      // Error log removed
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to create shipping label'
      });
    }
  }

  /**
   * Track shipment
   * GET /api/v1/shipping/track/:trackingNumber
   */
  async trackShipment(req: Request, res: Response) {
    try {
      const { trackingNumber } = req.params;
      const { carrier } = req.query;
      
      const tracking = await shippingService.trackShipment(
        trackingNumber,
        carrier as string | undefined
      );
      
      res.json({
        success: true,
        data: tracking
      });
    } catch (error: any) {
      // Error log removed
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to track shipment'
      });
    }
  }

  /**
   * Cancel shipment
   * DELETE /api/v1/shipping/cancel/:trackingNumber
   */
  async cancelShipment(req: Request, res: Response) {
    try {
      const { trackingNumber } = req.params;
      
      const cancelled = await shippingService.cancelShipment(trackingNumber);
      
      res.json({
        success: true,
        data: { cancelled }
      });
    } catch (error: any) {
      // Error log removed
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to cancel shipment'
      });
    }
  }

  /**
   * Get shipping history for an order
   * GET /api/v1/shipping/history/:orderId
   */
  async getShippingHistory(req: Request, res: Response) {
    try {
      const { orderId } = req.params;
      
      const history = await shippingService.getShippingHistory(orderId);
      
      res.json({
        success: true,
        data: history
      });
    } catch (error: any) {
      // Error log removed
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to get shipping history'
      });
    }
  }

  /**
   * Webhook handler for carrier updates
   * POST /api/v1/shipping/webhook/:carrier
   */
  async handleCarrierWebhook(req: Request, res: Response) {
    try {
      const { carrier } = req.params;
      const data = req.body;
      
      await shippingService.handleCarrierWebhook(carrier, data);
      
      // Most carriers expect a simple 200 OK response
      res.status(200).send('OK');
    } catch (error: any) {
      // Error log removed
      res.status(500).json({
        success: false,
        message: 'Webhook processing failed'
      });
    }
  }

  /**
   * Get available carriers
   * GET /api/v1/shipping/carriers
   */
  async getAvailableCarriers(req: Request, res: Response) {
    try {
      const carriers = await shippingService.getAvailableCarriers();
      
      res.json({
        success: true,
        data: carriers
      });
    } catch (error: any) {
      // Error log removed
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to get carriers'
      });
    }
  }

  /**
   * Bulk create shipping labels
   * POST /api/v1/shipping/bulk-label
   */
  async bulkCreateLabels(req: Request, res: Response) {
    try {
      const { orderIds, carrier } = req.body;
      
      if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Order IDs array is required'
        });
      }

      const results = [];
      const errors = [];

      for (const orderId of orderIds) {
        try {
          const label = await shippingService.createShippingLabel(orderId, carrier);
          results.push({
            orderId,
            success: true,
            label
          });
        } catch (error: any) {
          errors.push({
            orderId,
            success: false,
            error: error.message
          });
        }
      }

      res.json({
        success: true,
        data: {
          successful: results,
          failed: errors,
          summary: {
            total: orderIds.length,
            succeeded: results.length,
            failed: errors.length
          }
        }
      });
    } catch (error: any) {
      // Error log removed
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to create labels'
      });
    }
  }

  /**
   * Update all tracking information
   * POST /api/v1/shipping/update-tracking
   */
  async updateAllTracking(req: Request, res: Response) {
    try {
      await shippingService.updateAllTracking();
      
      res.json({
        success: true,
        message: 'Tracking update initiated'
      });
    } catch (error: any) {
      // Error log removed
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to update tracking'
      });
    }
  }

  /**
   * Get shipment statistics
   * GET /api/v1/shipping/stats
   */
  async getShipmentStats(req: Request, res: Response) {
    try {
      const { startDate, endDate } = req.query;
      
      const query = this.shipmentRepository
        .createQueryBuilder('shipment')
        .select('shipment.carrier', 'carrier')
        .addSelect('shipment.status', 'status')
        .addSelect('COUNT(*)', 'count')
        .addSelect('AVG(shipment.shippingCost)', 'avgCost');

      if (startDate && endDate) {
        query.where('shipment.created_at BETWEEN :startDate AND :endDate', {
          startDate: new Date(startDate as string),
          endDate: new Date(endDate as string)
        });
      }

      const stats = await query
        .groupBy('shipment.carrier')
        .addGroupBy('shipment.status')
        .getRawMany();

      // Calculate summary
      const summary = {
        totalShipments: stats.reduce((sum, s) => sum + parseInt(s.count), 0),
        byCarrier: {} as any,
        byStatus: {} as any
      };

      stats.forEach(stat => {
        // By carrier
        if (!summary.byCarrier[stat.carrier]) {
          summary.byCarrier[stat.carrier] = {
            total: 0,
            avgCost: 0,
            statuses: {}
          };
        }
        summary.byCarrier[stat.carrier].total += parseInt(stat.count);
        summary.byCarrier[stat.carrier].avgCost = parseFloat(stat.avgCost);
        summary.byCarrier[stat.carrier].statuses[stat.status] = parseInt(stat.count);

        // By status
        if (!summary.byStatus[stat.status]) {
          summary.byStatus[stat.status] = 0;
        }
        summary.byStatus[stat.status] += parseInt(stat.count);
      });

      res.json({
        success: true,
        data: {
          raw: stats,
          summary
        }
      });
    } catch (error: any) {
      // Error log removed
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to get statistics'
      });
    }
  }
}