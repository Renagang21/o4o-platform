/**
 * Layout Selection Rules
 * Determines which layout to use based on analyzed intent
 */

import { AnalyzedIntent, LayoutType } from '../types';

export function selectLayout(intent: AnalyzedIntent): LayoutType {
  // Dashboard category → DashboardLayout
  if (intent.category === 'dashboard') {
    return 'DashboardLayout';
  }

  // Commerce category → ShopLayout
  if (intent.category === 'commerce') {
    return 'ShopLayout';
  }

  // Auth category → AuthLayout
  if (intent.category === 'auth') {
    return 'AuthLayout';
  }

  // Admin category → DashboardLayout
  if (intent.category === 'admin') {
    return 'DashboardLayout';
  }

  // Default fallback
  return 'DefaultLayout';
}
