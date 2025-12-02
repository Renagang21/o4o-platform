/**
 * Component Selection Rules
 * Maps view IDs to appropriate function components
 */

import { AnalyzedIntent } from '../types';

export function selectFunctionComponents(intent: AnalyzedIntent): string[] {
  const { viewId, category, action } = intent;

  // Exact view ID matches
  const exactMatches: Record<string, string[]> = {
    'seller-dashboard': ['sellerDashboard'],
    'product-list': ['productList'],
    'product-detail': ['productDetail'],
    'cart': ['cart'],
    'order-list': ['orderList'],
    'order-detail': ['orderDetail'],
    'login': ['login'],
    'signup': ['signup'],
    'reset-password': ['resetPassword'],
    'admin-seller-list': ['adminSellerList'],
    'admin-product-list': ['adminProductList'],
    'admin-order-list': ['adminOrderList'],
  };

  if (exactMatches[viewId]) {
    return exactMatches[viewId];
  }

  // Pattern-based matching
  if (category === 'commerce') {
    if (action === 'list') return ['productList'];
    if (action === 'detail') return ['productDetail'];
  }

  if (category === 'dashboard') {
    return ['sellerDashboard'];
  }

  if (category === 'auth') {
    if (viewId.includes('login')) return ['login'];
    if (viewId.includes('signup')) return ['signup'];
    if (viewId.includes('reset')) return ['resetPassword'];
  }

  if (category === 'admin') {
    if (viewId.includes('seller')) return ['adminSellerList'];
    if (viewId.includes('product')) return ['adminProductList'];
    if (viewId.includes('order')) return ['adminOrderList'];
  }

  // Fallback: return empty array for custom views
  return [];
}
