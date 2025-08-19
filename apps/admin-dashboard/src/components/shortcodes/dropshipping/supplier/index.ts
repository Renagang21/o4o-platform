// Supplier Shortcodes Export
export { default as ProductManager } from './ProductManager';
export { default as InventoryDashboard } from './InventoryDashboard';
export { default as OrderManagement } from './OrderManagement';

// Shortcode Registration Map
export const supplierShortcodes = {
  'product_manager': {
    component: 'ProductManager',
    description: 'Complete product management system for suppliers',
    attributes: {}
  },
  'product_upload_bulk': {
    component: 'ProductUploadBulk',
    description: 'Bulk product upload interface',
    attributes: {
      format: {
        type: 'select',
        options: ['csv', 'excel', 'json'],
        default: 'csv',
        description: 'File format for bulk upload'
      }
    }
  },
  'inventory_dashboard': {
    component: 'InventoryDashboard',
    description: 'Real-time inventory monitoring and management',
    attributes: {}
  },
  'pricing_manager': {
    component: 'PricingManager',
    description: 'Product pricing and discount management',
    attributes: {}
  },
  'supplier_order_management': {
    component: 'OrderManagement',
    description: 'Order processing and fulfillment system',
    attributes: {}
  },
  'shipping_manager': {
    component: 'ShippingManager',
    description: 'Shipping and tracking management',
    attributes: {}
  },
  'tracking_number_input': {
    component: 'TrackingNumberInput',
    description: 'Quick tracking number input widget',
    attributes: {
      orderId: {
        type: 'string',
        required: false,
        description: 'Specific order ID to update'
      }
    }
  },
  'return_request_handler': {
    component: 'ReturnRequestHandler',
    description: 'Handle return and refund requests',
    attributes: {}
  }
};