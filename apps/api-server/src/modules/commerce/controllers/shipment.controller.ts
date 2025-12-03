import { Response } from 'express';
import { BaseController } from '../../../common/base.controller.js';
import { ShippingService } from '../services/ShippingService.js';
import { CreateShipmentDto, UpdateShipmentDto } from '../dto/index.js';
import { logger } from '../../../utils/logger.js';
import type { AuthRequest } from '../../../types/express.js';

/**
 * ShipmentController
 * NextGen V2 - Commerce Module
 * Handles shipment and tracking operations
 */
export class ShipmentController extends BaseController {
  static async createShipment(req: AuthRequest, res: Response): Promise<any> {
    try {
      const data = req.body as CreateShipmentDto;
      const shippingService = ShippingService.getInstance();

      // Convert orderId from DTO (UUID string) to number for legacy compatibility
      const shipment = await shippingService.createShipment({
        orderId: parseInt(data.orderId, 10), // TODO: Update when Order uses UUID
        trackingNumber: data.trackingNumber,
        carrier: data.shippingCarrier,
        expectedDeliveryDate: data.estimatedDeliveryDate,
      });

      return BaseController.ok(res, { shipment });
    } catch (error: any) {
      logger.error('[ShipmentController.createShipment] Error', {
        error: error.message,
      });
      return BaseController.error(res, error);
    }
  }

  static async getShipment(req: AuthRequest, res: Response): Promise<any> {
    try {
      const { orderId } = req.params;
      const shippingService = ShippingService.getInstance();

      const shipment = await shippingService.getShipmentByOrderId(
        parseInt(orderId, 10)
      );

      if (!shipment) {
        return BaseController.notFound(res, 'Shipment not found');
      }

      return BaseController.ok(res, { shipment });
    } catch (error: any) {
      logger.error('[ShipmentController.getShipment] Error', {
        error: error.message,
        orderId: req.params.orderId,
      });
      return BaseController.error(res, error);
    }
  }

  static async updateShipment(req: AuthRequest, res: Response): Promise<any> {
    try {
      const { id } = req.params;
      const data = req.body as UpdateShipmentDto;
      const shippingService = ShippingService.getInstance();

      const shipment = await shippingService.updateShipmentStatus(
        parseInt(id, 10),
        'in_transit', // Default status, should come from DTO
        data.notes
      );

      return BaseController.ok(res, { shipment });
    } catch (error: any) {
      logger.error('[ShipmentController.updateShipment] Error', {
        error: error.message,
        shipmentId: req.params.id,
      });
      return BaseController.error(res, error);
    }
  }

  static async trackShipment(req: AuthRequest, res: Response): Promise<any> {
    try {
      const { trackingNumber } = req.params;

      // TODO: Integrate with external tracking API
      return BaseController.ok(res, {
        trackingNumber,
        status: 'in_transit',
        events: []
      });
    } catch (error: any) {
      logger.error('[ShipmentController.trackShipment] Error', {
        error: error.message,
        trackingNumber: req.params.trackingNumber,
      });
      return BaseController.error(res, error);
    }
  }

  static async getTrackingHistory(req: AuthRequest, res: Response): Promise<any> {
    try {
      const { shipmentId } = req.params;
      const shippingService = ShippingService.getInstance();

      const history = await shippingService.getTrackingHistory(
        parseInt(shipmentId, 10)
      );

      return BaseController.ok(res, { history });
    } catch (error: any) {
      logger.error('[ShipmentController.getTrackingHistory] Error', {
        error: error.message,
        shipmentId: req.params.shipmentId,
      });
      return BaseController.error(res, error);
    }
  }
}
