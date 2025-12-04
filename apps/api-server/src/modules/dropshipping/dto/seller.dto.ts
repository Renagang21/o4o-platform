/**
 * Seller DTOs
 * Phase B-4 Step 10 - Seller query DTOs
 */

/**
 * Seller query parameters
 */
export interface SellerQueryDto {
  status?: 'ACTIVE' | 'PENDING' | 'SUSPENDED' | 'INACTIVE';
  search?: string; // Search by business name or contact email
  page?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'businessName' | 'status';
  sortOrder?: 'ASC' | 'DESC';
}
