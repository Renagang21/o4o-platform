/**
 * Dropshipping Shortcode Registration
 * Register all dropshipping-related shortcodes
 */

import { registerShortcode } from '../registry';
import { SellerDashboard } from './SellerDashboard';
import { SupplierDashboard } from './SupplierDashboard';
import { AffiliateDashboard } from './AffiliateDashboard';

// Import additional components (to be created)
// import { SellerOrders } from './SellerOrders';
// import { SellerInventory } from './SellerInventory';
// import { SellerAnalytics } from './SellerAnalytics';
// import { SupplierOrders } from './SupplierOrders';
// import { SupplierCatalog } from './SupplierCatalog';
// import { AffiliateLinks } from './AffiliateLinks';
// import { AffiliateCommissions } from './AffiliateCommissions';

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
export { SellerDashboard } from './SellerDashboard';
export { SupplierDashboard } from './SupplierDashboard';
export { AffiliateDashboard } from './AffiliateDashboard';