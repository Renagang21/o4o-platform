/**
 * Supplier DTOs
 * Phase B-4 Step 10 - Supplier query DTOs
 */

/**
 * Supplier query parameters
 */
export interface SupplierQueryDto {
  status?: 'ACTIVE' | 'PENDING' | 'SUSPENDED' | 'INACTIVE';
  search?: string; // Search by company name or contact email
  page?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'companyName' | 'status';
  sortOrder?: 'ASC' | 'DESC';
}
