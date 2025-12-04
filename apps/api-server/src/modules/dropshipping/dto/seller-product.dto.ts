/**
 * SellerProduct DTOs
 * Phase B-4 Step 10 - SellerProduct CRUD and query DTOs
 */

/**
 * Create seller product DTO
 */
export interface CreateSellerProductDto {
  productId: string;
  margin: number; // Seller's margin amount
  price: number; // Seller's selling price
  isActive?: boolean;
  minQuantity?: number;
  maxQuantity?: number;
  customDescription?: string;
}

/**
 * Update seller product DTO
 */
export interface UpdateSellerProductDto {
  margin?: number;
  price?: number;
  isActive?: boolean;
  minQuantity?: number;
  maxQuantity?: number;
  customDescription?: string;
}

/**
 * Seller product query parameters
 */
export interface SellerProductQueryDto {
  sellerId?: string;
  productId?: string;
  isActive?: boolean;
  minMargin?: number;
  maxMargin?: number;
  search?: string; // Search by product name
  page?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'price' | 'margin' | 'productName';
  sortOrder?: 'ASC' | 'DESC';
}
