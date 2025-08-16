/**
 * Shipping Service
 * 배송사 통합 서비스
 */

import { AppDataSource } from '../../database/connection';
import { Order, OrderStatus, PaymentMethod } from '../../entities/Order';
import { Shipment } from '../../entities/Shipment';
import { ShippingCarrier } from '../../entities/ShippingCarrier';
import { CJLogisticsConnector } from './connectors/CJLogisticsConnector';
import { HanjinConnector } from './connectors/HanjinConnector';
import { LogenConnector } from './connectors/LogenConnector';
import { KoreanPostConnector } from './connectors/KoreanPostConnector';
import axios from 'axios';

export interface ShippingLabel {
  trackingNumber: string;
  carrier: string;
  labelUrl?: string;
  estimatedDelivery?: Date;
  shippingCost: number;
}

export interface TrackingInfo {
  trackingNumber: string;
  carrier: string;
  status: 'pending' | 'picked_up' | 'in_transit' | 'out_for_delivery' | 'delivered' | 'failed';
  currentLocation?: string;
  estimatedDelivery?: Date;
  events: TrackingEvent[];
}

export interface TrackingEvent {
  timestamp: Date;
  location: string;
  status: string;
  description: string;
}

export interface ShippingRate {
  carrier: string;
  serviceName: string;
  estimatedDays: number;
  cost: number;
  available: boolean;
}

export class ShippingService {
  private orderRepository = AppDataSource.getRepository(Order);
  private shipmentRepository = AppDataSource.getRepository(Shipment);
  private carrierRepository = AppDataSource.getRepository(ShippingCarrier);
  
  private connectors: Map<string, any> = new Map();

  constructor() {
    // Initialize shipping connectors
    this.connectors.set('cj', new CJLogisticsConnector());
    this.connectors.set('hanjin', new HanjinConnector());
    this.connectors.set('logen', new LogenConnector());
    this.connectors.set('koreanpost', new KoreanPostConnector());
  }

  /**
   * Calculate shipping rates for an order
   */
  async calculateShippingRates(orderId: string): Promise<ShippingRate[]> {
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
      relations: ['items', 'shippingAddress']
    });

    if (!order) {
      throw new Error('Order not found');
    }

    const weight = this.calculateTotalWeight(order);
    const destination = order.shippingAddress;
    
    const rates: ShippingRate[] = [];
    
    // Get rates from each carrier
    for (const [carrierCode, connector] of this.connectors) {
      try {
        const rate = await connector.getRate({
          weight,
          destination,
          items: order.items
        });
        
        if (rate) {
          rates.push({
            carrier: carrierCode,
            serviceName: rate.serviceName,
            estimatedDays: rate.estimatedDays,
            cost: rate.cost,
            available: rate.available
          });
        }
      } catch (error) {
        console.error(`Failed to get rate from ${carrierCode}:`, error);
      }
    }

    // Sort by cost
    rates.sort((a, b) => a.cost - b.cost);
    
    return rates;
  }

  /**
   * Create shipping label and tracking number
   */
  async createShippingLabel(orderId: string, carrierCode: string): Promise<ShippingLabel> {
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
      relations: ['items', 'shippingAddress', 'customer']
    });

    if (!order) {
      throw new Error('Order not found');
    }

    const connector = this.connectors.get(carrierCode);
    if (!connector) {
      throw new Error(`Carrier ${carrierCode} not supported`);
    }

    // Create shipment record
    const shipment = new Shipment();
    shipment.orderId = parseInt(orderId);
    shipment.carrier = carrierCode;
    shipment.carrierCode = carrierCode;
    shipment.status = 'pending';
    
    // Set sender info (default for now)
    const senderAddress = await this.getDefaultSenderAddress();
    shipment.senderName = senderAddress.name;
    shipment.senderPhone = senderAddress.phone;
    shipment.senderAddress = `${senderAddress.address1} ${senderAddress.address2 || ''}`;
    shipment.senderPostalCode = senderAddress.postalCode;
    
    // Set recipient info
    shipment.recipientName = order.shippingAddress.name;
    shipment.recipientPhone = order.shippingAddress.phone;
    shipment.recipientAddress = `${order.shippingAddress.address} ${order.shippingAddress.addressDetail || ''}`;
    shipment.recipientPostalCode = order.shippingAddress.zipCode;
    
    // Set metadata for items and address details
    shipment.metadata = {
      items: order.items.map(item => ({
        productId: item.productId,
        productName: item.product?.name || '',
        quantity: item.quantity,
        weight: item.product?.weight || 0
      })),
      shippingAddress: {
        city: order.shippingAddress.city,
        state: order.shippingAddress.state,
        country: order.shippingAddress.country
      }
    };

    // Convert address format for carrier API
    const receiverAddress = {
      name: order.shippingAddress.name,
      phone: order.shippingAddress.phone,
      address1: order.shippingAddress.address,
      address2: order.shippingAddress.addressDetail,
      city: order.shippingAddress.city,
      state: order.shippingAddress.state,
      postalCode: order.shippingAddress.zipCode,
      country: order.shippingAddress.country
    };

    // Request tracking number from carrier
    const labelResponse = await connector.createLabel({
      order,
      sender: await this.getDefaultSenderAddress(),
      receiver: receiverAddress,
      items: order.items,
      cod: order.paymentMethod === PaymentMethod.CASH_ON_DELIVERY, // Cash on delivery
      insurance: order.totalAmount > 100000 // Insure high-value orders
    });

    shipment.trackingNumber = labelResponse.trackingNumber;
    shipment.expectedDeliveryDate = labelResponse.estimatedDelivery;
    
    // Store label URL in metadata
    shipment.metadata = {
      ...shipment.metadata,
      labelUrl: labelResponse.labelUrl
    };
    shipment.shippingCost = labelResponse.cost;

    await this.shipmentRepository.save(shipment);

    // Update order status
    order.status = OrderStatus.PROCESSING;
    order.trackingNumber = labelResponse.trackingNumber;
    await this.orderRepository.save(order);

    return {
      trackingNumber: labelResponse.trackingNumber,
      carrier: carrierCode,
      labelUrl: labelResponse.labelUrl,
      estimatedDelivery: labelResponse.estimatedDelivery,
      shippingCost: labelResponse.cost
    };
  }

  /**
   * Track shipment status
   */
  async trackShipment(trackingNumber: string, carrier?: string): Promise<TrackingInfo> {
    // Find shipment in database
    const shipment = await this.shipmentRepository.findOne({
      where: carrier ? { trackingNumber, carrier } : { trackingNumber }
    });

    if (!shipment) {
      throw new Error('Shipment not found');
    }

    const connector = this.connectors.get(shipment.carrier);
    if (!connector) {
      throw new Error(`Carrier ${shipment.carrier} not supported`);
    }

    // Get tracking info from carrier API
    const trackingData = await connector.track(trackingNumber);

    // Update shipment status in database
    shipment.status = trackingData.status;
    
    // Store tracking details in metadata
    shipment.metadata = {
      ...shipment.metadata,
      currentLocation: trackingData.currentLocation,
      trackingEvents: trackingData.events,
      lastUpdated: new Date()
    };

    await this.shipmentRepository.save(shipment);

    // Update order status if delivered
    if (trackingData.status === 'delivered') {
      const order = await this.orderRepository.findOne({
        where: { id: String(shipment.orderId) }
      });
      
      if (order) {
        order.status = OrderStatus.DELIVERED;
        order.deliveredAt = new Date();
        await this.orderRepository.save(order);
      }
    }

    return {
      trackingNumber,
      carrier: shipment.carrier,
      status: trackingData.status,
      currentLocation: trackingData.currentLocation,
      estimatedDelivery: trackingData.estimatedDelivery,
      events: trackingData.events
    };
  }

  /**
   * Update tracking for all active shipments
   */
  async updateAllTracking(): Promise<void> {
    const activeShipments = await this.shipmentRepository.find({
      where: [
        { status: 'pending' },
        { status: 'picked_up' },
        { status: 'in_transit' },
        { status: 'out_for_delivery' }
      ]
    });

    // TODO: Replace with proper logger

    for (const shipment of activeShipments) {
      try {
        await this.trackShipment(shipment.trackingNumber, shipment.carrier);
      } catch (error) {
        console.error(`Failed to update tracking for ${shipment.trackingNumber}:`, error);
      }
    }
  }

  /**
   * Cancel shipment
   */
  async cancelShipment(trackingNumber: string): Promise<boolean> {
    const shipment = await this.shipmentRepository.findOne({
      where: { trackingNumber }
    });

    if (!shipment) {
      throw new Error('Shipment not found');
    }

    if (shipment.status !== 'pending') {
      throw new Error('Can only cancel pending shipments');
    }

    const connector = this.connectors.get(shipment.carrier);
    if (!connector) {
      throw new Error(`Carrier ${shipment.carrier} not supported`);
    }

    // Request cancellation from carrier
    const cancelled = await connector.cancelLabel(trackingNumber);

    if (cancelled) {
      shipment.status = 'cancelled' as any; // temporary fix for enum
      shipment.metadata = {
        ...shipment.metadata,
        cancelledAt: new Date()
      };
      await this.shipmentRepository.save(shipment);

      // Update order
      const order = await this.orderRepository.findOne({
        where: { id: String(shipment.orderId) }
      });
      
      if (order) {
        order.trackingNumber = null;
        order.status = OrderStatus.PENDING;
        await this.orderRepository.save(order);
      }
    }

    return cancelled;
  }

  /**
   * Get shipping history for an order
   */
  async getShippingHistory(orderId: string): Promise<Shipment[]> {
    return await this.shipmentRepository.find({
      where: { orderId: parseInt(orderId) },
      order: { createdAt: 'DESC' }
    });
  }

  /**
   * Webhook handler for carrier updates
   */
  async handleCarrierWebhook(carrier: string, data: any): Promise<void> {
    const connector = this.connectors.get(carrier);
    if (!connector) {
      throw new Error(`Carrier ${carrier} not supported`);
    }

    // Parse webhook data
    const update = await connector.parseWebhook(data);
    
    if (update && update.trackingNumber) {
      // Update tracking info
      await this.trackShipment(update.trackingNumber, carrier);
    }
  }

  /**
   * Helper: Calculate total weight of order items
   */
  private calculateTotalWeight(order: Order): number {
    return order.items.reduce((total, item) => {
      const weight = item.product?.weight || 500; // Default 500g per item
      return total + (weight * item.quantity);
    }, 0);
  }

  /**
   * Helper: Get default sender address
   */
  private async getDefaultSenderAddress() {
    return {
      name: '네이처 물류센터',
      phone: '02-1234-5678',
      address1: '서울특별시 강남구 테헤란로 123',
      address2: '물류센터 3층',
      city: '서울특별시',
      state: '강남구',
      postalCode: '06234',
      country: 'KR'
    };
  }

  /**
   * Get available carriers
   */
  async getAvailableCarriers(): Promise<ShippingCarrier[]> {
    return await this.carrierRepository.find({
      where: { isActive: true },
      order: { priority: 'ASC' }
    });
  }

  /**
   * Register new carrier
   */
  async registerCarrier(carrierData: {
    code: string;
    name: string;
    apiUrl?: string;
    apiKey?: string;
    supportsCod?: boolean;
    supportsInsurance?: boolean;
  }): Promise<ShippingCarrier> {
    const carrier = new ShippingCarrier();
    Object.assign(carrier, carrierData);
    carrier.isActive = true;
    carrier.priority = 999;
    
    return await this.carrierRepository.save(carrier);
  }
}

export const shippingService = new ShippingService();