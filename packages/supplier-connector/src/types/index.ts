/**
 * Supplier Connector Types
 * Core interfaces for dropshipping supplier integrations
 */

export interface SupplierProduct {
  sku: string;
  name: string;
  description?: string;
  price: number;
  comparePrice?: number;
  cost: number; // Supplier cost
  currency: string;
  images: string[];
  category?: string;
  tags?: string[];
  variants?: ProductVariant[];
  inventory: InventoryStatus;
  shipping?: ShippingInfo;
  supplier: SupplierInfo;
}

export interface ProductVariant {
  id: string;
  sku: string;
  name: string;
  price: number;
  cost: number;
  inventory: number;
  attributes: Record<string, any>;
}

export interface InventoryStatus {
  available: number;
  reserved?: number;
  incoming?: number;
  lastUpdated: Date;
}

export interface ShippingInfo {
  weight?: number;
  dimensions?: {
    length: number;
    width: number;
    height: number;
  };
  shippingClass?: string;
  estimatedDays?: number;
}

export interface SupplierInfo {
  id: string;
  name: string;
  type: 'domestic' | 'international' | 'marketplace';
  country?: string;
}

export interface SupplierOrder {
  orderId: string;
  supplierOrderId?: string;
  items: OrderItem[];
  customer: CustomerInfo;
  shipping: ShippingAddress;
  totalAmount: number;
  currency: string;
  status: OrderStatus;
  notes?: string;
}

export interface OrderItem {
  sku: string;
  quantity: number;
  price: number;
  cost: number;
  variantId?: string;
}

export interface CustomerInfo {
  name: string;
  email: string;
  phone?: string;
}

export interface ShippingAddress {
  name: string;
  address1: string;
  address2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone?: string;
}

export type OrderStatus = 
  | 'pending'
  | 'processing'
  | 'confirmed'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'refunded';

export interface ShipmentTracking {
  trackingNumber: string;
  carrier: string;
  status: string;
  estimatedDelivery?: Date;
  events: TrackingEvent[];
}

export interface TrackingEvent {
  timestamp: Date;
  status: string;
  location?: string;
  description: string;
}

export interface SupplierResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  meta?: Record<string, any>;
}

/**
 * Main Supplier Connector Interface
 * All supplier connectors must implement this interface
 */
export interface SupplierConnector {
  // Product Management
  syncProducts(options?: SyncOptions): Promise<SupplierProduct[]>;
  getProduct(sku: string): Promise<SupplierProduct | null>;
  searchProducts(query: string, filters?: ProductFilters): Promise<SupplierProduct[]>;
  
  // Inventory Management
  checkInventory(sku: string): Promise<InventoryStatus>;
  bulkCheckInventory(skus: string[]): Promise<Map<string, InventoryStatus>>;
  reserveInventory(sku: string, quantity: number): Promise<boolean>;
  
  // Order Management
  createOrder(order: SupplierOrder): Promise<SupplierResponse<OrderConfirmation>>;
  getOrderStatus(orderId: string): Promise<OrderStatus>;
  cancelOrder(orderId: string, reason?: string): Promise<boolean>;
  
  // Shipping & Tracking
  getShippingRates(items: OrderItem[], address: ShippingAddress): Promise<ShippingRate[]>;
  trackShipment(trackingNumber: string): Promise<ShipmentTracking>;
  
  // Webhook Support
  handleWebhook?(event: string, data: any): Promise<void>;
  
  // Configuration
  validateCredentials(): Promise<boolean>;
  getSupplierInfo(): SupplierInfo;
}

export interface SyncOptions {
  full?: boolean;
  categories?: string[];
  since?: Date;
  limit?: number;
  offset?: number;
}

export interface ProductFilters {
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  tags?: string[];
}

export interface OrderConfirmation {
  supplierOrderId: string;
  orderId: string;
  status: OrderStatus;
  estimatedShipping?: Date;
  trackingNumber?: string;
  totalAmount: number;
}

export interface ShippingRate {
  carrier: string;
  service: string;
  cost: number;
  estimatedDays: number;
  trackingAvailable: boolean;
}

/**
 * Supplier Connector Configuration
 */
export interface SupplierConfig {
  type: 'api' | 'csv' | 'xml' | 'scraper';
  credentials?: {
    apiKey?: string;
    apiSecret?: string;
    username?: string;
    password?: string;
    endpoint?: string;
  };
  options?: {
    rateLimit?: number; // requests per second
    timeout?: number; // ms
    retryAttempts?: number;
    webhookUrl?: string;
  };
}

/**
 * Base Abstract Class for Supplier Connectors
 */
export abstract class BaseSupplierConnector implements SupplierConnector {
  protected config: SupplierConfig;
  protected supplierInfo: SupplierInfo;

  constructor(config: SupplierConfig, supplierInfo: SupplierInfo) {
    this.config = config;
    this.supplierInfo = supplierInfo;
  }

  abstract syncProducts(options?: SyncOptions): Promise<SupplierProduct[]>;
  abstract getProduct(sku: string): Promise<SupplierProduct | null>;
  abstract searchProducts(query: string, filters?: ProductFilters): Promise<SupplierProduct[]>;
  abstract checkInventory(sku: string): Promise<InventoryStatus>;
  abstract bulkCheckInventory(skus: string[]): Promise<Map<string, InventoryStatus>>;
  abstract reserveInventory(sku: string, quantity: number): Promise<boolean>;
  abstract createOrder(order: SupplierOrder): Promise<SupplierResponse<OrderConfirmation>>;
  abstract getOrderStatus(orderId: string): Promise<OrderStatus>;
  abstract cancelOrder(orderId: string, reason?: string): Promise<boolean>;
  abstract getShippingRates(items: OrderItem[], address: ShippingAddress): Promise<ShippingRate[]>;
  abstract trackShipment(trackingNumber: string): Promise<ShipmentTracking>;
  abstract validateCredentials(): Promise<boolean>;
  
  getSupplierInfo(): SupplierInfo {
    return this.supplierInfo;
  }

  // Helper methods
  protected async makeRequest<T>(
    method: string,
    url: string,
    data?: any,
    headers?: Record<string, string>
  ): Promise<T> {
    // Implementation will be provided by specific connectors
    throw new Error('makeRequest must be implemented by subclass');
  }

  protected handleError(error: any): never {
    console.error(`Supplier connector error: ${error.message}`);
    throw error;
  }
}