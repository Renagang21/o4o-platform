/**
 * Partner DTOs
 * Phase B-4 Step 10 - Partner query and update DTOs
 */

/**
 * Partner query parameters
 */
export interface PartnerQueryDto {
  status?: 'ACTIVE' | 'PENDING' | 'SUSPENDED' | 'INACTIVE';
  search?: string; // Search by company name, referral code, or contact email
  page?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'companyName' | 'status' | 'totalReferrals';
  sortOrder?: 'ASC' | 'DESC';
}

/**
 * Update partner DTO
 */
export interface UpdatePartnerDto {
  companyName?: string;
  businessNumber?: string;
  contactEmail?: string;
  contactPhone?: string;
  businessAddress?: string;
  referralCode?: string;
  commissionRate?: number;
  status?: 'ACTIVE' | 'PENDING' | 'SUSPENDED' | 'INACTIVE';
}
