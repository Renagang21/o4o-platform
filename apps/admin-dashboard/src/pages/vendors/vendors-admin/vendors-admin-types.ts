/**
 * VendorsAdmin Types
 *
 * WO-O4O-VENDORS-ADMIN-PAGES-SPLIT-V1
 * Extracted from VendorsAdmin.tsx (lines 22-42)
 */

export type VendorStatus = 'active' | 'pending' | 'suspended' | 'trash';
export type VendorTab = 'all' | 'active' | 'pending' | 'suspended' | 'trash';
export type VendorSortField = 'businessName' | 'revenue' | 'joinedAt' | 'products' | null;
export type VendorSortOrder = 'asc' | 'desc';

export interface Vendor {
  id: string;
  name: string;
  email: string;
  businessName: string;
  status: VendorStatus;
  products: number;
  revenue: number;
  commission: number;
  joinedAt: string;
  lastActivity: string;
  rating: number;
  reviewCount: number;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  avatar?: string;
}
