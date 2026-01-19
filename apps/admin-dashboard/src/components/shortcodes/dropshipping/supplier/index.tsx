/**
 * Supplier Components - Admin Dashboard
 *
 * Direct component exports for use outside the shortcode system.
 * Shortcode definitions are consolidated in ../index.tsx to avoid
 * Vite's dynamic/static import mixing warnings.
 */

// Re-export components for direct import (not for shortcode system)
export { default as SupplierProducts } from './SupplierProducts';
export { default as SupplierProductEditor } from './SupplierProductEditor';
