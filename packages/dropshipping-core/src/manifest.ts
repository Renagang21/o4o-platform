/**
 * Dropshipping-Core Manifest
 *
 * AppStore 표준 manifest - 산업 중립적·확장형·범용 Dropshipping 엔진
 */

export const manifest = {
  id: 'dropshipping-core',
  name: 'Dropshipping Core',
  version: '1.0.0',
  type: 'core',
  description:
    'Industry-neutral extensible dropshipping engine for O4O Platform - Supplier/Seller/Product/Order/Settlement/Commission management',

  author: 'O4O Platform',
  license: 'MIT',

  /**
   * Dependencies
   * Dropshipping-Core requires organization-core for organization-scoped features
   */
  dependencies: {
    core: ['organization-core'],
  },

  /**
   * Database Tables
   * Core가 소유하는 테이블 목록
   */
  ownsTables: [
    'dropshipping_suppliers',
    'dropshipping_sellers',
    'dropshipping_product_masters',
    'dropshipping_supplier_product_offers',
    'dropshipping_seller_listings',
    'dropshipping_order_relays',
    'dropshipping_settlement_batches',
    'dropshipping_commission_rules',
    'dropshipping_commission_transactions',
  ],

  /**
   * Permissions
   */
  permissions: [
    'dropshipping.read',
    'dropshipping.write',
    'dropshipping.manage',
    'dropshipping.supplier',
    'dropshipping.seller',
    'dropshipping.admin',
  ],

  /**
   * Lifecycle Hooks
   */
  lifecycle: {
    onInstall: './lifecycle/install.js',
    onActivate: './lifecycle/activate.js',
    onDeactivate: './lifecycle/deactivate.js',
    onUninstall: './lifecycle/uninstall.js',
  },

  /**
   * Features
   */
  features: [
    'supplier-management',
    'seller-management',
    'product-master-catalog',
    'supplier-offer-system',
    'seller-listing-management',
    'order-relay-workflow',
    'settlement-batch-processing',
    'commission-calculation-engine',
    'multi-channel-support',
    'industry-neutral-architecture',
  ],

  /**
   * Configuration
   */
  config: {
    enableAutoRelayToSupplier: {
      type: 'boolean',
      default: true,
      description: 'Automatically relay orders to suppliers when created',
    },
    defaultCommissionRate: {
      type: 'number',
      default: 10,
      description: 'Default commission rate percentage',
    },
    settlementCycle: {
      type: 'string',
      default: 'monthly',
      description: 'Settlement cycle: daily, weekly, monthly',
    },
    requireSellerApproval: {
      type: 'boolean',
      default: true,
      description: 'Require admin approval for new sellers',
    },
    requireSupplierApproval: {
      type: 'boolean',
      default: true,
      description: 'Require admin approval for new suppliers',
    },
  },

  /**
   * Events
   * Core에서 발행하는 이벤트 목록
   */
  events: [
    'product.master.updated',
    'product.offer.updated',
    'listing.created',
    'order.created',
    'order.relay.dispatched',
    'order.relay.fulfilled',
    'settlement.closed',
    'commission.applied',
  ],

  /**
   * API Routes
   */
  apiRoutes: [
    '/api/v1/dropshipping/core/supplier',
    '/api/v1/dropshipping/core/seller',
    '/api/v1/dropshipping/core/products',
    '/api/v1/dropshipping/core/offers',
    '/api/v1/dropshipping/core/listings',
    '/api/v1/dropshipping/core/orders',
    '/api/v1/dropshipping/core/orders/relay',
    '/api/v1/dropshipping/core/settlement',
    '/api/v1/dropshipping/core/commission',
  ],
};

export default manifest;
