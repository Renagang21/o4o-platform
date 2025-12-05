/**
 * Commerce Module Entities
 *
 * All entity exports for Commerce domain
 * NextGen V2 Architecture - Entities moved from src/entities/
 */

// Product & Category
export * from './Product.js';
export * from './Category.js';

// Cart
export * from './Cart.js';
export * from './CartItem.js';

// Order (exports Order, OrderItem interface, OrderStatus, PaymentStatus, PaymentMethod)
export * from './Order.js';
export { OrderItem } from './OrderItem.js';  // Export OrderItem entity class (interface already exported from Order.js)
export * from './OrderEvent.js';

// Payment (Note: PaymentMethod and PaymentStatus already exported from Order.js)
export { Payment } from './Payment.js';
export * from './PaymentSettlement.js';

// Shipment
export * from './Shipment.js';
export * from './ShipmentTrackingHistory.js';

// External Channels (Multichannel RPA)
export * from './ExternalChannel.js';
export * from './ChannelProductLink.js';
export * from './ChannelOrderLink.js';
