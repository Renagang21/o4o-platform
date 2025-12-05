import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsUUID,
  Min,
  IsInt,
  MinLength,
} from 'class-validator';

/**
 * SellerProduct DTOs
 * Phase B-4 Step 10 - SellerProduct CRUD and query DTOs
 */

/**
 * Create seller product DTO
 */
export class CreateSellerProductDto {
  @IsUUID()
  productId: string;

  @IsNumber()
  @Min(0)
  margin: number; // Seller's margin amount

  @IsNumber()
  @Min(0)
  price: number; // Seller's selling price

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  minQuantity?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  maxQuantity?: number;

  @IsOptional()
  @IsString()
  @MinLength(1)
  customDescription?: string;
}

/**
 * Update seller product DTO
 */
export class UpdateSellerProductDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  margin?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  minQuantity?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  maxQuantity?: number;

  @IsOptional()
  @IsString()
  @MinLength(1)
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
