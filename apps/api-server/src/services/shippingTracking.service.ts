import { AppDataSource } from '../database/connection';
import { ShippingTracking, ShippingStatus, ShippingCarrier } from '../entities/ShippingTracking';
import { Order } from '../entities/Order';
import { EmailService } from './email.service';
import { Repository } from 'typeorm';

export class ShippingTrackingService {
  private trackingRepository: Repository<ShippingTracking>;
  private orderRepository: Repository<Order>;
  private emailService: EmailService;

  constructor() {
    this.trackingRepository = AppDataSource.getRepository(ShippingTracking);
    this.orderRepository = AppDataSource.getRepository(Order);
    this.emailService = new EmailService();
  }

  /**
   * Create shipping tracking for an order
   */
  async createShippingTracking(data: {
    orderId: string;
    carrier: ShippingCarrier;
    trackingNumber: string;
    shippingAddress?: any;
    estimatedDeliveryDate?: Date;
    shippingCost?: number;
    weight?: number;
    dimensions?: any;
  }): Promise<ShippingTracking> {
    const tracking = this.trackingRepository.create({
      ...data,
      status: ShippingStatus.PENDING,
      trackingHistory: [{
        timestamp: new Date(),
        status: ShippingStatus.PENDING,
        location: 'Warehouse',
        description: 'Shipping label created'
      }]
    });

    const savedTracking = await this.trackingRepository.save(tracking);

    // Update order status
    await this.orderRepository.update(data.orderId, {
      status: 'processing' as any
    });

    // Send notification email
    await this.sendTrackingNotification(savedTracking);

    return savedTracking;
  }

  /**
   * Update tracking status
   */
  async updateTrackingStatus(
    trackingId: string,
    status: ShippingStatus,
    location?: string,
    description?: string
  ): Promise<ShippingTracking> {
    const tracking = await this.trackingRepository.findOne({
      where: { id: trackingId },
      relations: ['order']
    });

    if (!tracking) {
      throw new Error('Tracking not found');
    }

    tracking.status = status;
    
    // Add tracking event
    tracking.addTrackingEvent({
      status,
      location: location || 'Unknown',
      description: description || this.getStatusDescription(status)
    });

    // Update delivery dates based on status
    if (status === ShippingStatus.DELIVERED) {
      tracking.actualDeliveryDate = new Date();
      
      // Update order status
      if (tracking.order) {
        tracking.order.status = 'delivered' as any;
        await this.orderRepository.save(tracking.order);
      }
    }

    const updatedTracking = await this.trackingRepository.save(tracking);

    // Send status update notification
    await this.sendStatusUpdateNotification(updatedTracking);

    return updatedTracking;
  }

  /**
   * Get tracking by tracking number
   */
  async getTrackingByNumber(
    trackingNumber: string,
    carrier?: ShippingCarrier
  ): Promise<ShippingTracking | null> {
    const whereCondition: any = { trackingNumber };
    if (carrier) {
      whereCondition.carrier = carrier;
    }

    return await this.trackingRepository.findOne({
      where: whereCondition,
      relations: ['order']
    });
  }

  /**
   * Get tracking by order ID
   */
  async getTrackingByOrderId(orderId: string): Promise<ShippingTracking | null> {
    return await this.trackingRepository.findOne({
      where: { orderId },
      relations: ['order']
    });
  }

  /**
   * Get all trackings with specific status
   */
  async getTrackingsByStatus(status: ShippingStatus): Promise<ShippingTracking[]> {
    return await this.trackingRepository.find({
      where: { status },
      relations: ['order']
    });
  }

  /**
   * Batch update tracking from carrier API
   */
  async batchUpdateFromCarrier(carrier: ShippingCarrier): Promise<void> {
    const trackings = await this.trackingRepository.find({
      where: { 
        carrier,
        status: ShippingStatus.IN_TRANSIT
      }
    });

    for (const tracking of trackings) {
      try {
        // This would normally call the carrier's API
        const updates = await this.fetchCarrierUpdates(tracking);
        
        if (updates && updates.length > 0) {
          for (const update of updates) {
            tracking.addTrackingEvent(update);
          }
          
          // Update status based on latest event
          const latestStatus = this.mapCarrierStatusToInternal(
            updates[updates.length - 1].status,
            carrier
          );
          
          if (latestStatus) {
            tracking.status = latestStatus;
          }
          
          await this.trackingRepository.save(tracking);
        }
      } catch (error) {
        // Log error but continue with other trackings
        // Error handling removed as requested
      }
    }
  }

  /**
   * Mark shipment as failed
   */
  async markAsFailed(
    trackingId: string,
    reason: string
  ): Promise<ShippingTracking> {
    const tracking = await this.trackingRepository.findOne({
      where: { id: trackingId }
    });

    if (!tracking) {
      throw new Error('Tracking not found');
    }

    tracking.status = ShippingStatus.FAILED;
    tracking.failureReason = reason;
    tracking.addTrackingEvent({
      status: ShippingStatus.FAILED,
      location: tracking.getLatestUpdate()?.location || 'Unknown',
      description: `Delivery failed: ${reason}`
    });

    return await this.trackingRepository.save(tracking);
  }

  /**
   * Process return shipment
   */
  async processReturn(
    trackingId: string,
    returnTrackingNumber: string
  ): Promise<ShippingTracking> {
    const tracking = await this.trackingRepository.findOne({
      where: { id: trackingId }
    });

    if (!tracking) {
      throw new Error('Tracking not found');
    }

    tracking.status = ShippingStatus.RETURNED;
    tracking.returnTrackingNumber = returnTrackingNumber;
    tracking.addTrackingEvent({
      status: ShippingStatus.RETURNED,
      location: 'Return Center',
      description: `Return initiated with tracking: ${returnTrackingNumber}`
    });

    return await this.trackingRepository.save(tracking);
  }

  /**
   * Get delivery statistics
   */
  async getDeliveryStatistics(
    startDate: Date,
    endDate: Date
  ): Promise<any> {
    const trackings = await this.trackingRepository
      .createQueryBuilder('tracking')
      .where('tracking.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate
      })
      .getMany();

    const stats = {
      total: trackings.length,
      delivered: trackings.filter(t => t.status === ShippingStatus.DELIVERED).length,
      inTransit: trackings.filter(t => t.isInTransit()).length,
      failed: trackings.filter(t => t.status === ShippingStatus.FAILED).length,
      returned: trackings.filter(t => t.status === ShippingStatus.RETURNED).length,
      averageDeliveryTime: 0,
      byCarrier: {} as Record<string, number>
    };

    // Calculate average delivery time
    const deliveredTrackings = trackings.filter(t => 
      t.status === ShippingStatus.DELIVERED && 
      t.actualDeliveryDate
    );
    
    if (deliveredTrackings.length > 0) {
      const totalTime = deliveredTrackings.reduce((sum, t) => {
        const diff = t.actualDeliveryDate!.getTime() - t.createdAt.getTime();
        return sum + diff;
      }, 0);
      
      stats.averageDeliveryTime = Math.round(
        totalTime / deliveredTrackings.length / (1000 * 60 * 60 * 24)
      ); // in days
    }

    // Group by carrier
    for (const tracking of trackings) {
      if (!stats.byCarrier[tracking.carrier]) {
        stats.byCarrier[tracking.carrier] = 0;
      }
      stats.byCarrier[tracking.carrier]++;
    }

    return stats;
  }

  /**
   * Helper: Get status description
   */
  private getStatusDescription(status: ShippingStatus): string {
    const descriptions: Record<ShippingStatus, string> = {
      [ShippingStatus.PENDING]: 'Shipment is being prepared',
      [ShippingStatus.PICKED_UP]: 'Package picked up by carrier',
      [ShippingStatus.IN_TRANSIT]: 'Package is in transit',
      [ShippingStatus.OUT_FOR_DELIVERY]: 'Package is out for delivery',
      [ShippingStatus.DELIVERED]: 'Package delivered successfully',
      [ShippingStatus.FAILED]: 'Delivery attempt failed',
      [ShippingStatus.RETURNED]: 'Package returned to sender',
      [ShippingStatus.CANCELLED]: 'Shipment cancelled'
    };
    
    return descriptions[status] || 'Status updated';
  }

  /**
   * Helper: Map carrier status to internal status
   */
  private mapCarrierStatusToInternal(
    carrierStatus: string,
    carrier: ShippingCarrier
  ): ShippingStatus | null {
    // This would contain carrier-specific mapping logic
    // For now, returning null to indicate no mapping
    return null;
  }

  /**
   * Helper: Fetch updates from carrier API
   */
  private async fetchCarrierUpdates(
    tracking: ShippingTracking
  ): Promise<any[]> {
    // This would normally make an API call to the carrier
    // For now, returning empty array
    return [];
  }

  /**
   * Send tracking notification email
   */
  private async sendTrackingNotification(
    tracking: ShippingTracking
  ): Promise<void> {
    // Implementation would send email using EmailService
    // with tracking details and tracking URL
  }

  /**
   * Send status update notification email
   */
  private async sendStatusUpdateNotification(
    tracking: ShippingTracking
  ): Promise<void> {
    // Implementation would send email using EmailService
    // when status changes significantly
  }
}