/**
 * Dropshipping Shortcode Registration
 * Register all dropshipping-related shortcodes
 */

import { registerShortcode } from '../registry.js';
import { SellerDashboard } from './SellerDashboard.js';
import { SupplierDashboard } from './SupplierDashboard.js';
import { AffiliateDashboard } from './AffiliateDashboard.js';

// Import additional components (to be created)
// import { SellerOrders } from './SellerOrders.js';
// import { SellerInventory } from './SellerInventory.js';
// import { SellerAnalytics } from './SellerAnalytics.js';
// import { SupplierOrders } from './SupplierOrders.js';
// import { SupplierCatalog } from './SupplierCatalog.js';
// import { AffiliateLinks } from './AffiliateLinks.js';
// import { AffiliateCommissions } from './AffiliateCommissions.js';

/**
 * Register all dropshipping shortcodes
 */
export function registerDropshippingShortcodes() {
  // Seller shortcodes
  registerShortcode({
    name: 'seller_dashboard',
    component: SellerDashboard as any,
    description: 'Seller dashboard showing sales and inventory'
  });

  // Supplier shortcodes
  registerShortcode({
    name: 'supplier_dashboard',
    component: SupplierDashboard as any,
    description: 'Supplier dashboard for order processing'
  });

  // Affiliate shortcodes
  registerShortcode({
    name: 'affiliate_dashboard',
    component: AffiliateDashboard as any,
    description: 'Affiliate dashboard for commission tracking'
  });

  // Dropshipping shortcodes registered successfully
}

// Export components for direct use
export { SellerDashboard } from './SellerDashboard.js';
export { SupplierDashboard } from './SupplierDashboard.js';
export { AffiliateDashboard } from './AffiliateDashboard.js';