/**
 * Partner Components - Admin Dashboard
 *
 * Direct component exports for use outside the shortcode system.
 * Shortcode definitions are consolidated in ../index.tsx to avoid
 * Vite's dynamic/static import mixing warnings.
 */

// Re-export components for direct import (not for shortcode system)
export { default as PartnerLinkGenerator } from './PartnerLinkGenerator';
export { default as PartnerCommissionDashboard } from './PartnerCommissionDashboard';
export { default as PayoutRequests } from './PayoutRequests';
export { default as PartnerDashboard, PartnerMainDashboard } from './PartnerDashboard';
export { default as PartnerProducts } from './PartnerProducts';
export { default as PartnerCommissions } from './PartnerCommissions';
