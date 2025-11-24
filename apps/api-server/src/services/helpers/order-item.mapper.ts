/**
 * R-8-6: Order Item Mapper (OrderItem Entity Only)
 *
 * Helper functions for OrderItem-based data access
 *
 * Strategy:
 * - All order items are accessed via OrderItem entities (order.itemsRelation)
 * - JSONB fallback has been removed (R-8-6 migration)
 * - Maintains consistent interface for backward compatibility
 */

import type { Order, OrderItem as OrderItemInterface } from '../../entities/Order.js';
import type { OrderItem as OrderItemEntity } from '../../entities/OrderItem.js';

/**
 * Customer-facing order item DTO
 * Used in CustomerOrderService for list and detail views
 */
export interface CustomerOrderItemDto {
  id: string;
  productId: string;
  productName: string;
  productSku: string;
  productImage: string;
  productBrand?: string;
  variationName?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  sellerId: string;
  sellerName: string;
}

/**
 * Get order items from OrderItem entities
 *
 * @param order - Order entity (must have itemsRelation loaded)
 * @returns Array of items from OrderItem entities
 */
export function getOrderItems(order: Order): OrderItemInterface[] {
  // Return items from OrderItem entities
  if (!order.itemsRelation || order.itemsRelation.length === 0) {
    return [];
  }

  return order.itemsRelation.map(entityToInterface);
}

/**
 * Convert OrderItem entity to interface format
 *
 * R-8-4: Includes presentation fields (productImage, productBrand, variationName)
 * R-8-5: Presentation field normalization applied
 * R-8-6: Only source is OrderItem entity (JSONB removed)
 */
function entityToInterface(entity: OrderItemEntity): OrderItemInterface {
  return {
    id: entity.id,
    productId: entity.productId,
    productName: entity.productName,
    productSku: entity.productSku,
    productImage: entity.productImage,
    productBrand: entity.productBrand,
    variationName: entity.variationName,
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
 *
 * R-8-5: Presentation field normalization rules:
 * - Required fields (productSku, productImage): Fallback to '' (empty string)
 * - Optional fields (productBrand, variationName): Preserved as-is (undefined allowed)
 *
 * @param order - Order entity (must have itemsRelation loaded)
 * @returns Array of CustomerOrderItemDto
 */
export function mapOrderItemsForCustomer(order: Order): CustomerOrderItemDto[] {
  const items = getOrderItems(order);

  return items.map((item) => ({
    id: item.id,
    productId: item.productId,
    productName: item.productName,
    // R-8-5: Required fields - default to empty string
    productSku: item.productSku || '',
    productImage: item.productImage || '',
    // R-8-5: Optional presentation fields - preserved as-is
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
 *
 * @param order - Order entity (must have itemsRelation loaded)
 * @returns Total quantity of all items
 */
export function getOrderItemCount(order: Order): number {
  const items = getOrderItems(order);
  return items.reduce((sum, item) => sum + item.quantity, 0);
}

/**
 * Get first item from order (for list view representative item)
 *
 * @param order - Order entity (must have itemsRelation loaded)
 * @returns First item or undefined
 */
export function getFirstOrderItem(order: Order): OrderItemInterface | undefined {
  const items = getOrderItems(order);
  return items[0];
}
