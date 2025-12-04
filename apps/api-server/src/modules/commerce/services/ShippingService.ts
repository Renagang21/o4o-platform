import { Shipment } from '../entities/Shipment.js';
import { ShipmentTrackingHistory } from '../entities/ShipmentTrackingHistory.js';
import { BaseService } from '../../../common/base.service.js';
import { AppDataSource } from '../../../database/connection.js';
import logger from '../../../utils/logger.js';
import { Repository } from 'typeorm';

/**
 * ShippingService
 * NextGen V2 - BaseService pattern
 * Handles shipment and tracking operations
 */
export class ShippingService extends BaseService<Shipment> {
  private static instance: ShippingService;
  private trackingRepo: Repository<ShipmentTrackingHistory>;

  constructor() {
    const repo = AppDataSource.getRepository(Shipment);
    super(repo);
    this.trackingRepo = AppDataSource.getRepository(ShipmentTrackingHistory);
  }

  static getInstance(): ShippingService {
    if (!ShippingService.instance) {
      ShippingService.instance = new ShippingService();
    }
    return ShippingService.instance;
  }

  async createShipment(data: {
    orderId: number;
    trackingNumber: string;
    carrier: string;
    carrierCode?: string;
    shippingCost?: number;
    shippingAddress?: any;
    expectedDeliveryDate?: Date;
  }): Promise<Shipment> {
    try {
      const shipment = this.repo.create({
        ...data,
        status: 'pending',
      });
      return await this.repo.save(shipment);
    } catch (error: any) {
      logger.error('[ShippingService.createShipment] Error', {
        error: error.message,
        data,
      });
      throw new Error('Failed to create shipment');
    }
  }

  async getShipmentByOrderId(orderId: number): Promise<Shipment | null> {
    try {
      return await this.repo.findOne({
        where: { orderId },
      });
    } catch (error: any) {
      logger.error('[ShippingService.getShipmentByOrderId] Error', {
        error: error.message,
        orderId,
      });
      throw new Error('Failed to get shipment');
    }
  }

  async updateShipmentStatus(
    shipmentId: number,
    status: string,
    location?: string,
    description?: string
  ): Promise<Shipment> {
    try {
      const shipment = await this.repo.findOne({
        where: { id: shipmentId },
      });

      if (!shipment) {
        throw new Error('Shipment not found');
      }

      shipment.status = status;
      shipment.currentLocation = location || shipment.currentLocation;
      shipment.lastUpdated = new Date();

      if (status === 'shipped' && !shipment.shippedAt) {
        shipment.shippedAt = new Date();
      }

      if (status === 'delivered' && !shipment.deliveredAt) {
        shipment.deliveredAt = new Date();
      }

      // Add tracking history
      await this.trackingRepo.save({
        shipmentId,
        status,
        location,
        description,
        trackingTime: new Date(),
      });

      return await this.repo.save(shipment);
    } catch (error: any) {
      logger.error('[ShippingService.updateShipmentStatus] Error', {
        error: error.message,
        shipmentId,
      });
      throw error;
    }
  }

  async getTrackingHistory(shipmentId: number): Promise<ShipmentTrackingHistory[]> {
    try {
      return await this.trackingRepo.find({
        where: { shipmentId },
        order: { trackingTime: 'ASC' },
      });
    } catch (error: any) {
      logger.error('[ShippingService.getTrackingHistory] Error', {
        error: error.message,
        shipmentId,
      });
      throw new Error('Failed to get tracking history');
    }
  }
}
