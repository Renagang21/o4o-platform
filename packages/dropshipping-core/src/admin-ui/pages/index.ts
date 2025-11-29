/**
 * Dropshipping Core - Admin UI Pages
 *
 * Exports all admin dashboard pages for dropshipping management
 */

// Export admin pages
export { default as AdminAuthorizationConsole } from './dropshipping/AdminAuthorizationConsole.js';
export { default as Approvals } from './dropshipping/Approvals.js';
export { default as BulkProductImport } from './dropshipping/BulkProductImport.js';
export { default as Commissions } from './dropshipping/Commissions.js';
export { default as Orders } from './dropshipping/Orders.js';
export { default as PartnersList } from './dropshipping/PartnersList.js';
export { default as ProductEditor } from './dropshipping/ProductEditor.js';
export { default as Products } from './dropshipping/Products.js';
export { default as SellerAuthorizations } from './dropshipping/SellerAuthorizations.js';
export { default as SellersList } from './dropshipping/SellersList.js';
export { default as Settlements } from './dropshipping/Settlements.js';
export { default as SupplierAuthorizationInbox } from './dropshipping/SupplierAuthorizationInbox.js';
export { default as SuppliersList } from './dropshipping/SuppliersList.js';
export { default as SystemSetup } from './dropshipping/SystemSetup.js';

// Export router
export { default as DropshippingRouter } from './dropshipping/index.js';
