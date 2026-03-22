/**
 * VendorsCommissionAdmin Types
 *
 * WO-O4O-VENDORS-ADMIN-PAGES-SPLIT-V1
 * Extracted from VendorsCommissionAdmin.tsx (lines 25-44)
 */

export type CommissionStatus = 'all' | 'paid' | 'pending' | 'processing' | 'scheduled';
export type CommissionSortField = 'vendorName' | 'sales' | 'rate' | 'amount' | 'date' | null;
export type CommissionSortOrder = 'asc' | 'desc';

export interface CommissionRecord {
  id: string;
  vendorId: string;
  vendorName: string;
  businessName: string;
  period: string;
  sales: number;
  commissionRate: number;
  commissionAmount: number;
  status: 'paid' | 'pending' | 'processing' | 'scheduled';
  paidDate?: string;
  dueDate?: string;
  bankAccount?: string;
  taxInvoice?: boolean;
  notes?: string;
}
