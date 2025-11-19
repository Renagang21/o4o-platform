import type { SellerChannelAccount } from '../entities/SellerChannelAccount.js';
import type { ChannelProductLink } from '../entities/ChannelProductLink.js';

/**
 * Channel Connector Interface
 * Phase PD-9: Multichannel RPA 1차
 *
 * Abstract interface that all channel connectors must implement.
 * Defines common operations for product export and order import.
 */

/**
 * Result of a product export operation
 */
export interface ExportProductResult {
  success: boolean;
  externalProductId?: string;
  externalUrl?: string;
  error?: string;
}

/**
 * Result of a batch product export operation
 */
export interface ExportResult {
  successful: Array<{
    linkId: string;
    externalProductId: string;
    externalUrl?: string;
  }>;
  failed: Array<{
    linkId: string;
    error: string;
  }>;
}

/**
 * External order item data
 */
export interface ExternalOrderItem {
  externalProductId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  options?: Record<string, string>;
}

/**
 * External order data structure
 */
export interface ExternalOrder {
  externalOrderId: string;
  externalOrderDate: Date;
  buyerName: string;
  buyerEmail?: string;
  buyerPhone: string;
  items: ExternalOrderItem[];
  summary: {
    subtotal: number;
    shipping: number;
    tax: number;
    discount: number;
    total: number;
  };
  shippingAddress: {
    recipientName: string;
    phone: string;
    zipCode: string;
    address: string;
    detailAddress: string;
    city: string;
    country: string;
    deliveryRequest?: string;
  };
  paymentMethod?: string;
  paymentStatus?: string;
  metadata?: Record<string, any>;
}

/**
 * Result of order import operation
 */
export interface ImportOrdersResult {
  orders: ExternalOrder[];
  total: number;
  hasMore: boolean;
}

/**
 * Result of inventory sync operation
 */
export interface SyncResult {
  success: boolean;
  syncedCount: number;
  error?: string;
}

/**
 * Parameters for product export
 */
export interface ExportProductsParams {
  account: SellerChannelAccount;
  links: ChannelProductLink[];
}

/**
 * Parameters for order import
 */
export interface ImportOrdersParams {
  account: SellerChannelAccount;
  since?: Date;
  limit?: number;
}

/**
 * Parameters for inventory sync
 */
export interface SyncInventoryParams {
  account: SellerChannelAccount;
  productIds?: string[];
}

/**
 * Main Channel Connector Interface
 */
export interface IChannelConnector {
  /**
   * Unique channel code (e.g., 'test_channel', 'naver_smartstore')
   */
  readonly channelCode: string;

  /**
   * Export products to external channel
   * Creates or updates products on the external platform
   *
   * @param params Export parameters including account and product links
   * @returns Result with successful and failed exports
   */
  exportProducts(params: ExportProductsParams): Promise<ExportResult>;

  /**
   * Import orders from external channel
   * Fetches new orders from the external platform
   *
   * @param params Import parameters including account and optional filters
   * @returns List of external orders to be converted to O4O orders
   */
  importOrders(params: ImportOrdersParams): Promise<ImportOrdersResult>;

  /**
   * Sync inventory with external channel (optional)
   * Updates inventory levels based on external channel data
   *
   * @param params Sync parameters including account and product filters
   * @returns Sync result with count and status
   */
  syncInventory?(params: SyncInventoryParams): Promise<SyncResult>;

  /**
   * Validate account credentials (optional)
   * Tests if the provided credentials are valid
   *
   * @param account Channel account to validate
   * @returns True if credentials are valid
   */
  validateCredentials?(account: SellerChannelAccount): Promise<boolean>;

  /**
   * Get channel-specific metadata (optional)
   * Returns information about the channel's capabilities, limits, etc.
   *
   * @returns Channel metadata
   */
  getChannelMetadata?(): Promise<Record<string, any>>;
}
