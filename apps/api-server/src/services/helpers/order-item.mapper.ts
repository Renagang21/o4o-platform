/**
 * R-8-3-3: Order Item Mapper
 *
 * Common helper functions for OrderItem-based data access with JSONB fallback
 *
 * Strategy:
 * 1. Prefer OrderItem entities (order.itemsRelation)
 * 2. Fallback to JSONB (order.items) for legacy orders
 * 3. Maintain 100% backward compatibility
 */

import type { Order, OrderItem as OrderItemInterface } from '../../entities/Order.js';
import type { OrderItem as OrderItemEntity } from '../../entities/OrderItem.js';

/**
 * Customer-facing order item DTO
 * Used in CustomerOrderService for list and detail views
 *
 * Note: productSku and productImage are required in CustomerOrderDetailDto
 * but may be empty strings when using OrderItem entities (not stored)
 */
export interface CustomerOrderItemDto {
  id: string;
  productId: string;
  productName: string;
  productSku: string; // R-8-3-3: Required (empty string fallback)
  productImage: string; // R-8-3-3: Required (empty string fallback)
  productBrand?: string;
  variationName?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  sellerId: string;
  sellerName: string;
}

/**
 * Get order items with OrderItem-first, JSONB-fallback strategy
 *
 * @param order - Order entity (with or without itemsRelation loaded)
 * @returns Array of items from OrderItem entities or JSONB
 */
export function getOrderItems(order: Order): OrderItemInterface[] {
  // Strategy 1: Use OrderItem entities if available
  if (order.itemsRelation && order.itemsRelation.length > 0) {
    return order.itemsRelation.map(entityToInterface);
  }

  // Strategy 2: Fallback to JSONB
  return order.items || [];
}

/**
 * Convert OrderItem entity to legacy JSONB interface format
 * Used for backward compatibility
 *
 * R-8-4: Updated to include presentation fields (productImage, productBrand, variationName)
 * These fields are now stored in OrderItem entity after R-8-4 migration
 */
function entityToInterface(entity: OrderItemEntity): OrderItemInterface {
  return {
    id: entity.id,
    productId: entity.productId,
    productName: entity.productName,
    productSku: entity.productSku,
    productImage: entity.productImage, // R-8-4: Now stored in entity
    productBrand: entity.productBrand, // R-8-4: Now stored in entity
    variationName: entity.variationName, // R-8-4: Now stored in entity
    quantity: entity.quantity,
    unitPrice: entity.unitPrice,
    totalPrice: entity.totalPrice,
    sellerId: entity.sellerId,
    sellerName: entity.sellerName,
    supplierId: entity.supplierId,
    supplierName: entity.supplierName,
    sellerProductId: entity.sellerProductId,
    basePriceSnapshot: entity.basePriceSnapshot,
    salePriceSnapshot: entity.salePriceSnapshot,
    marginAmountSnapshot: entity.marginAmountSnapshot,
    commissionType: entity.commissionType,
    commissionRate: entity.commissionRate,
    commissionAmount: entity.commissionAmount,
    attributes: entity.attributes,
    notes: entity.notes,
  };
}

/**
 * Map order items to customer-facing DTO
 * Supports both OrderItem entities and JSONB items
 *
 * Note: When using OrderItem entities, some fields may be undefined
 * (productImage, productBrand, variationName are not stored in entity)
 *
 * @param order - Order entity
 * @returns Array of CustomerOrderItemDto
 */
export function mapOrderItemsForCustomer(order: Order): CustomerOrderItemDto[] {
  const items = getOrderItems(order);

  return items.map((item) => ({
    id: item.id,
    productId: item.productId,
    productName: item.productName,
    productSku: item.productSku || '', // R-8-3-3: Default to empty string for DTO compatibility
    productImage: item.productImage || '', // R-8-3-3: Default to empty string for DTO compatibility
    productBrand: item.productBrand,
    variationName: item.variationName,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    totalPrice: item.totalPrice,
    sellerId: item.sellerId,
    sellerName: item.sellerName,
  }));
}

/**
 * Calculate total item count from order
 * Supports both OrderItem entities and JSONB items
 *
 * @param order - Order entity
 * @returns Total quantity of all items
 */
export function getOrderItemCount(order: Order): number {
  const items = getOrderItems(order);
  return items.reduce((sum, item) => sum + item.quantity, 0);
}

/**
 * Get first item from order (for list view representative item)
 * Supports both OrderItem entities and JSONB items
 *
 * @param order - Order entity
 * @returns First item or undefined
 */
export function getFirstOrderItem(order: Order): OrderItemInterface | undefined {
  const items = getOrderItems(order);
  return items[0];
}
