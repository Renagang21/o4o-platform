/**
 * CSV Supplier Connector
 * For suppliers who provide product catalogs via CSV files
 */

import { parse } from 'csv-parse';
import * as fs from 'fs/promises';
import * as path from 'path';
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

interface CSVProduct {
  sku: string;
  name: string;
  description?: string;
  price: string;
  cost: string;
  stock: string;
  category?: string;
  images?: string;
  weight?: string;
  tags?: string;
}

export class CSVSupplierConnector extends BaseSupplierConnector {
  private products: Map<string, SupplierProduct> = new Map();
  private csvPath: string;
  private lastSync: Date | null = null;

  constructor(config: SupplierConfig) {
    const supplierInfo: SupplierInfo = {
      id: 'csv-supplier',
      name: 'CSV Catalog Supplier',
      type: 'domestic',
      country: 'KR'
    };
    
    super(config, supplierInfo);
    this.csvPath = config.credentials?.endpoint || './catalogs/products.csv';
  }

  async syncProducts(options?: SyncOptions): Promise<SupplierProduct[]> {
    try {
      const csvContent = await fs.readFile(this.csvPath, 'utf-8');
      
      return new Promise((resolve, reject) => {
        parse(csvContent, {
          columns: true,
          skip_empty_lines: true,
          trim: true
        }, (err, records: CSVProduct[]) => {
          if (err) {
            reject(err);
            return;
          }

          this.products.clear();
          const products: SupplierProduct[] = [];

          for (const record of records) {
            const product = this.transformCSVProduct(record);
            this.products.set(product.sku, product);
            products.push(product);
          }

          this.lastSync = new Date();
          resolve(products);
        });
      });
    } catch (error) {
      this.handleError(error);
    }
  }

  async getProduct(sku: string): Promise<SupplierProduct | null> {
    // Sync if not synced recently
    if (!this.lastSync || Date.now() - this.lastSync.getTime() > 3600000) {
      await this.syncProducts();
    }
    
    return this.products.get(sku) || null;
  }

  async searchProducts(query: string, filters?: ProductFilters): Promise<SupplierProduct[]> {
    // Sync if not synced recently
    if (!this.lastSync || Date.now() - this.lastSync.getTime() > 3600000) {
      await this.syncProducts();
    }

    const results: SupplierProduct[] = [];
    const searchTerm = query.toLowerCase();

    for (const product of this.products.values()) {
      // Search in name and description
      const matchesSearch = 
        product.name.toLowerCase().includes(searchTerm) ||
        (product.description?.toLowerCase().includes(searchTerm) ?? false);

      if (!matchesSearch) continue;

      // Apply filters
      if (filters?.category && product.category !== filters.category) continue;
      if (filters?.minPrice && product.price < filters.minPrice) continue;
      if (filters?.maxPrice && product.price > filters.maxPrice) continue;
      if (filters?.inStock && product.inventory.available <= 0) continue;

      results.push(product);
    }

    return results;
  }

  async checkInventory(sku: string): Promise<InventoryStatus> {
    const product = await this.getProduct(sku);
    
    if (!product) {
      throw new Error(`Product with SKU ${sku} not found`);
    }

    return product.inventory;
  }

  async bulkCheckInventory(skus: string[]): Promise<Map<string, InventoryStatus>> {
    const inventoryMap = new Map<string, InventoryStatus>();
    
    for (const sku of skus) {
      const product = await this.getProduct(sku);
      if (product) {
        inventoryMap.set(sku, product.inventory);
      }
    }
    
    return inventoryMap;
  }

  async reserveInventory(sku: string, quantity: number): Promise<boolean> {
    const product = await this.getProduct(sku);
    
    if (!product) {
      return false;
    }

    if (product.inventory.available < quantity) {
      return false;
    }

    // Update local inventory (in real implementation, this would update the CSV or external system)
    product.inventory.available -= quantity;
    product.inventory.reserved = (product.inventory.reserved || 0) + quantity;
    
    return true;
  }

  async createOrder(order: SupplierOrder): Promise<SupplierResponse<OrderConfirmation>> {
    try {
      // For CSV supplier, we'll save orders to a separate CSV file
      const ordersPath = path.join(path.dirname(this.csvPath), 'orders.csv');
      
      const orderData = {
        supplier_order_id: `CSV-${Date.now()}`,
        order_id: order.orderId,
        items: JSON.stringify(order.items),
        customer_name: order.customer.name,
        customer_email: order.customer.email,
        shipping_address: JSON.stringify(order.shipping),
        total_amount: order.totalAmount,
        status: 'pending',
        created_at: new Date().toISOString()
      };

      // Append to orders CSV
      const csvLine = Object.values(orderData).join(',') + '\n';
      await fs.appendFile(ordersPath, csvLine);

      // Reserve inventory for order items
      for (const item of order.items) {
        await this.reserveInventory(item.sku, item.quantity);
      }

      return {
        success: true,
        data: {
          supplierOrderId: orderData.supplier_order_id,
          orderId: order.orderId,
          status: 'pending',
          totalAmount: order.totalAmount
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
    // For CSV, we'll always return 'processing' as a placeholder
    // In real implementation, this would read from the orders CSV
    return 'processing';
  }

  async cancelOrder(orderId: string, reason?: string): Promise<boolean> {
    // For CSV supplier, cancellation request is processed
    // Order cancellation requested with reason
    return true;
  }

  async getShippingRates(items: OrderItem[], address: ShippingAddress): Promise<ShippingRate[]> {
    // Calculate basic shipping rates based on items
    let totalWeight = 0;
    
    for (const item of items) {
      const product = await this.getProduct(item.sku);
      if (product?.shipping?.weight) {
        totalWeight += product.shipping.weight * item.quantity;
      }
    }

    // Basic shipping rate calculation
    const rates: ShippingRate[] = [
      {
        carrier: 'CJ대한통운',
        service: '일반택배',
        cost: totalWeight < 5 ? 3000 : totalWeight < 10 ? 4000 : 5000,
        estimatedDays: 2,
        trackingAvailable: true
      },
      {
        carrier: '한진택배',
        service: '일반택배',
        cost: totalWeight < 5 ? 3500 : totalWeight < 10 ? 4500 : 5500,
        estimatedDays: 3,
        trackingAvailable: true
      },
      {
        carrier: '우체국택배',
        service: '일반소포',
        cost: totalWeight < 5 ? 3200 : totalWeight < 10 ? 4200 : 5200,
        estimatedDays: 3,
        trackingAvailable: true
      }
    ];

    return rates;
  }

  async trackShipment(trackingNumber: string): Promise<ShipmentTracking> {
    // Mock tracking for CSV supplier
    return {
      trackingNumber,
      carrier: 'CJ대한통운',
      status: 'in_transit',
      estimatedDelivery: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      events: [
        {
          timestamp: new Date(),
          status: 'picked_up',
          location: '서울 물류센터',
          description: '상품을 수거했습니다'
        }
      ]
    };
  }

  async validateCredentials(): Promise<boolean> {
    try {
      // Check if CSV file exists and is readable
      await fs.access(this.csvPath, fs.constants.R_OK);
      return true;
    } catch {
      return false;
    }
  }

  private transformCSVProduct(record: CSVProduct): SupplierProduct {
    return {
      sku: record.sku,
      name: record.name,
      description: record.description,
      price: parseFloat(record.price) || 0,
      cost: parseFloat(record.cost) || 0,
      currency: 'KRW',
      images: record.images ? record.images.split(',').map(img => img.trim()) : [],
      category: record.category,
      tags: record.tags ? record.tags.split(',').map(tag => tag.trim()) : [],
      inventory: {
        available: parseInt(record.stock) || 0,
        lastUpdated: new Date()
      },
      shipping: record.weight ? {
        weight: parseFloat(record.weight),
        estimatedDays: 2
      } : undefined,
      supplier: this.supplierInfo
    };
  }
}