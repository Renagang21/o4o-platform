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

// Order (Note: Order.js exports OrderItem, Payment internally - no duplicates)
export * from './Order.js';
export * from './OrderEvent.js';

// Payment Settlement
export * from './PaymentSettlement.js';

// Shipment
export * from './Shipment.js';
export * from './ShipmentTrackingHistory.js';

// External Channels (Multichannel RPA)
export * from './ExternalChannel.js';
export * from './ChannelProductLink.js';
export * from './ChannelOrderLink.js';
