/**
 * Domestic Supplier Connector
 * For Korean domestic suppliers with API integration
 */

import axios, { AxiosInstance } from 'axios';
import {
  BaseSupplierConnector,
  SupplierConfig,
  SupplierInfo,
  SupplierProduct,
  SyncOptions,
  ProductFilters,
  InventoryStatus,
  SupplierOrder,
  SupplierResponse,
  OrderConfirmation,
  OrderStatus,
  OrderItem,
  ShippingAddress,
  ShippingRate,
  ShipmentTracking,
} from '../types/index.js';

export class DomesticSupplierConnector extends BaseSupplierConnector {
  private client: AxiosInstance;

  constructor(config: SupplierConfig) {
    const supplierInfo: SupplierInfo = {
      id: 'domestic-kr',
      name: 'Korean Domestic Supplier',
      type: 'domestic',
      country: 'KR'
    };

    super(config, supplierInfo);

    this.client = axios.create({
      baseURL: config.credentials?.endpoint || 'https://api.supplier.co.kr',
      timeout: config.options?.timeout || 30000,
      headers: {
        'Authorization': `Bearer ${config.credentials?.apiKey}`,
        'Content-Type': 'application/json'
      }
    });
  }

  async syncProducts(options?: SyncOptions): Promise<SupplierProduct[]> {
    try {
      const params = {
        full: options?.full || false,
        limit: options?.limit || 100,
        offset: options?.offset || 0,
        ...(options?.since && { updated_after: options.since.toISOString() })
      };

      const response = await this.client.get('/products', { params });
      
      return response.data.products.map(this.transformProduct);
    } catch (error) {
      this.handleError(error);
    }
  }

  async getProduct(sku: string): Promise<SupplierProduct | null> {
    try {
      const response = await this.client.get(`/products/${sku}`);
      
      if (!response.data) return null;
      
      return this.transformProduct(response.data);
    } catch (error: any) {
      if (error.response?.status === 404) return null;
      this.handleError(error);
    }
  }

  async searchProducts(query: string, filters?: ProductFilters): Promise<SupplierProduct[]> {
    try {
      const params = {
        q: query,
        ...(filters?.category && { category: filters.category }),
        ...(filters?.minPrice && { min_price: filters.minPrice }),
        ...(filters?.maxPrice && { max_price: filters.maxPrice }),
        ...(filters?.inStock && { in_stock: filters.inStock })
      };

      const response = await this.client.get('/products/search', { params });
      
      return response.data.products.map(this.transformProduct);
    } catch (error) {
      this.handleError(error);
    }
  }

  async checkInventory(sku: string): Promise<InventoryStatus> {
    try {
      const response = await this.client.get(`/inventory/${sku}`);
      
      return {
        available: response.data.available,
        reserved: response.data.reserved,
        incoming: response.data.incoming,
        lastUpdated: new Date(response.data.last_updated)
      };
    } catch (error) {
      this.handleError(error);
    }
  }

  async bulkCheckInventory(skus: string[]): Promise<Map<string, InventoryStatus>> {
    try {
      const response = await this.client.post('/inventory/bulk', { skus });
      
      const inventoryMap = new Map<string, InventoryStatus>();
      
      for (const item of response.data.inventory) {
        inventoryMap.set(item.sku, {
          available: item.available,
          reserved: item.reserved,
          incoming: item.incoming,
          lastUpdated: new Date(item.last_updated)
        });
      }
      
      return inventoryMap;
    } catch (error) {
      this.handleError(error);
    }
  }

  async reserveInventory(sku: string, quantity: number): Promise<boolean> {
    try {
      const response = await this.client.post('/inventory/reserve', {
        sku,
        quantity
      });
      
      return response.data.success;
    } catch (error) {
      this.handleError(error);
    }
  }

  async createOrder(order: SupplierOrder): Promise<SupplierResponse<OrderConfirmation>> {
    try {
      const payload = {
        order_id: order.orderId,
        items: order.items.map(item => ({
          sku: item.sku,
          quantity: item.quantity,
          price: item.price,
          variant_id: item.variantId
        })),
        customer: {
          name: order.customer.name,
          email: order.customer.email,
          phone: order.customer.phone
        },
        shipping_address: {
          name: order.shipping.name,
          address1: order.shipping.address1,
          address2: order.shipping.address2,
          city: order.shipping.city,
          state: order.shipping.state,
          postal_code: order.shipping.postalCode,
          country: order.shipping.country,
          phone: order.shipping.phone
        },
        total_amount: order.totalAmount,
        currency: order.currency,
        notes: order.notes
      };

      const response = await this.client.post('/orders', payload);
      
      return {
        success: true,
        data: {
          supplierOrderId: response.data.supplier_order_id,
          orderId: order.orderId,
          status: response.data.status,
          estimatedShipping: response.data.estimated_shipping ? 
            new Date(response.data.estimated_shipping) : undefined,
          trackingNumber: response.data.tracking_number,
          totalAmount: response.data.total_amount
        }
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async getOrderStatus(orderId: string): Promise<OrderStatus> {
    try {
      const response = await this.client.get(`/orders/${orderId}/status`);
      
      return response.data.status;
    } catch (error) {
      this.handleError(error);
    }
  }

  async cancelOrder(orderId: string, reason?: string): Promise<boolean> {
    try {
      const response = await this.client.post(`/orders/${orderId}/cancel`, {
        reason: reason || 'Customer request'
      });
      
      return response.data.success;
    } catch (error) {
      return false;
    }
  }

  async getShippingRates(items: OrderItem[], address: ShippingAddress): Promise<ShippingRate[]> {
    try {
      const response = await this.client.post('/shipping/rates', {
        items: items.map(item => ({
          sku: item.sku,
          quantity: item.quantity
        })),
        destination: {
          city: address.city,
          state: address.state,
          postal_code: address.postalCode,
          country: address.country
        }
      });
      
      return response.data.rates.map((rate: any) => ({
        carrier: rate.carrier,
        service: rate.service,
        cost: rate.cost,
        estimatedDays: rate.estimated_days,
        trackingAvailable: rate.tracking_available
      }));
    } catch (error) {
      this.handleError(error);
    }
  }

  async trackShipment(trackingNumber: string): Promise<ShipmentTracking> {
    try {
      const response = await this.client.get(`/tracking/${trackingNumber}`);
      
      return {
        trackingNumber,
        carrier: response.data.carrier,
        status: response.data.status,
        estimatedDelivery: response.data.estimated_delivery ? 
          new Date(response.data.estimated_delivery) : undefined,
        events: response.data.events.map((event: any) => ({
          timestamp: new Date(event.timestamp),
          status: event.status,
          location: event.location,
          description: event.description
        }))
      };
    } catch (error) {
      this.handleError(error);
    }
  }

  async validateCredentials(): Promise<boolean> {
    try {
      const response = await this.client.get('/auth/validate');
      return response.data.valid;
    } catch (error) {
      return false;
    }
  }

  private transformProduct(data: any): SupplierProduct {
    return {
      sku: data.sku,
      name: data.name,
      description: data.description,
      price: data.retail_price,
      comparePrice: data.compare_price,
      cost: data.wholesale_price,
      currency: data.currency || 'KRW',
      images: data.images || [],
      category: data.category,
      tags: data.tags || [],
      variants: data.variants?.map((v: any) => ({
        id: v.id,
        sku: v.sku,
        name: v.name,
        price: v.price,
        cost: v.cost,
        inventory: v.inventory,
        attributes: v.attributes
      })),
      inventory: {
        available: data.inventory?.available || 0,
        reserved: data.inventory?.reserved || 0,
        incoming: data.inventory?.incoming || 0,
        lastUpdated: new Date(data.inventory?.last_updated || Date.now())
      },
      shipping: data.shipping ? {
        weight: data.shipping.weight,
        dimensions: data.shipping.dimensions,
        shippingClass: data.shipping.class,
        estimatedDays: data.shipping.estimated_days
      } : undefined,
      supplier: this.supplierInfo
    };
  }
}