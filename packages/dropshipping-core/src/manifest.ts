/**
 * Dropshipping Core App Manifest
 *
 * Defines the dropshipping-core as a complete, installable core app.
 * This is the "engine" that powers multi-vendor dropshipping marketplace.
 */

import type { AppManifest } from '@o4o/types';

export const dropshippingCoreManifest: AppManifest = {
  appId: 'dropshipping-core',
  name: 'Dropshipping Core',
  type: 'core',
  version: '1.0.0',
  description: '멀티벤더 드랍쉬핑 마켓플레이스 코어 엔진',

  // Uninstall policy
  uninstallPolicy: {
    defaultMode: 'keep-data',
    allowPurge: true,
    autoBackup: true,
  },

  // Data ownership - dropshipping-core owns these tables
  ownsTables: [
    'products',
    'suppliers',
    'sellers',
    'seller_products',
    'seller_authorizations',
    'partners',
    'commissions',
    'commission_policies',
    'partner_commissions',
    'settlements',
    'settlement_items',
    'partner_profiles',
    'seller_profiles',
    'supplier_profiles',
    'channel_product_links',
    'seller_channel_accounts',
    'payment_settlements',
  ],

  // CPT definitions
  cpt: [
    {
      name: 'ds_product',
      storage: 'entity',
      primaryKey: 'id',
      label: '드랍쉬핑 상품',
      supports: ['title', 'content', 'metadata'],
    },
    {
      name: 'ds_supplier',
      storage: 'entity',
      primaryKey: 'id',
      label: '공급업체',
      supports: ['name', 'metadata'],
    },
    {
      name: 'ds_seller',
      storage: 'entity',
      primaryKey: 'id',
      label: '판매자',
      supports: ['name', 'metadata'],
    },
    {
      name: 'ds_partner',
      storage: 'entity',
      primaryKey: 'id',
      label: '파트너',
      supports: ['name', 'commission'],
    },
  ],

  // ACF groups
  acf: [
    {
      groupId: 'ds_product_meta',
      label: '드랍쉬핑 상품 메타데이터',
      fields: [
        {
          key: 'supplierPrice',
          type: 'number',
          label: '공급가',
          required: true,
        },
        {
          key: 'sellerPrice',
          type: 'number',
          label: '판매가',
          required: true,
        },
        {
          key: 'commissionRate',
          type: 'number',
          label: '수수료율 (%)',
        },
      ],
    },
  ],

  // Routes this app handles
  routes: [
    '/api/v2/seller',
    '/api/v2/seller/*',
    '/api/v2/supplier',
    '/api/v2/supplier/*',
    '/api/admin/dropshipping',
    '/api/admin/dropshipping/*',
    '/api/admin/seller-authorization',
    '/api/admin/seller-authorization/*',
  ],

  // Permissions
  permissions: [
    'dropshipping.read',
    'dropshipping.write',
    'dropshipping.admin',
    'seller.read',
    'seller.write',
    'seller.admin',
    'supplier.read',
    'supplier.write',
    'supplier.admin',
    'partner.read',
    'partner.write',
    'partner.admin',
    'commission.view',
    'commission.calculate',
    'commission.admin',
    'settlement.view',
    'settlement.process',
    'settlement.admin',
  ],

  // Lifecycle hooks
  lifecycle: {
    install: './lifecycle/install.js',
    activate: './lifecycle/activate.js',
    deactivate: './lifecycle/deactivate.js',
    uninstall: './lifecycle/uninstall.js',
  },

  // Installation options
  installOptions: {
    adoptExistingTables: true,
    keepDataOnUninstall: true,
  },

  // Menu definition
  menu: {
    id: 'dropshipping',
    label: '드랍쉬핑',
    icon: 'Package',
    path: '/dropshipping',
    position: 200,
    children: [
      {
        id: 'dropshipping-dashboard',
        label: '대시보드',
        icon: 'LayoutDashboard',
        path: '/dropshipping',
        requiredPermission: 'dropshipping.read',
      },
      {
        id: 'dropshipping-products',
        label: '상품 관리',
        icon: 'Package',
        path: '/dropshipping/products',
        requiredPermission: 'dropshipping.read',
      },
      {
        id: 'dropshipping-suppliers',
        label: '공급업체',
        icon: 'Truck',
        path: '/dropshipping/suppliers',
        requiredPermission: 'supplier.read',
      },
      {
        id: 'dropshipping-sellers',
        label: '판매자',
        icon: 'Store',
        path: '/dropshipping/sellers',
        requiredPermission: 'seller.read',
      },
      {
        id: 'dropshipping-partners',
        label: '파트너',
        icon: 'Users',
        path: '/dropshipping/partners',
        requiredPermission: 'partner.read',
      },
      {
        id: 'dropshipping-commissions',
        label: '수수료',
        icon: 'DollarSign',
        path: '/dropshipping/commissions',
        requiredPermission: 'commission.view',
      },
      {
        id: 'dropshipping-settlements',
        label: '정산',
        icon: 'CreditCard',
        path: '/dropshipping/settlements',
        requiredPermission: 'settlement.view',
      },
    ],
  },
};

export default dropshippingCoreManifest;
