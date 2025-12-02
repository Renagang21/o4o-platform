/**
 * Fetch Configuration Rules
 * Automatically generates fetch configs based on view ID
 */

import { FetchConfig } from '../types';

export function generateFetchConfig(viewId: string): FetchConfig | null {
  const fetchConfigs: Record<string, FetchConfig> = {
    'product-list': {
      queryKey: ['products', 'list'],
      url: '/api/products',
      method: 'GET',
    },
    'product-detail': {
      queryKey: ['products', 'detail'],
      url: '/api/products/:id',
      method: 'GET',
    },
    'seller-dashboard': {
      queryKey: ['seller', 'dashboard'],
      url: '/api/seller/dashboard',
      method: 'GET',
    },
    'cart': {
      queryKey: ['cart'],
      url: '/api/cart',
      method: 'GET',
    },
    'order-list': {
      queryKey: ['orders', 'list'],
      url: '/api/orders',
      method: 'GET',
    },
    'order-detail': {
      queryKey: ['orders', 'detail'],
      url: '/api/orders/:id',
      method: 'GET',
    },
    'admin-seller-list': {
      queryKey: ['admin', 'sellers'],
      url: '/api/admin/sellers',
      method: 'GET',
    },
    'admin-product-list': {
      queryKey: ['admin', 'products'],
      url: '/api/admin/products',
      method: 'GET',
    },
    'admin-order-list': {
      queryKey: ['admin', 'orders'],
      url: '/api/admin/orders',
      method: 'GET',
    },
  };

  return fetchConfigs[viewId] || null;
}
