/**
 * TEMPLATE: Resource DTOs
 *
 * Copy this file and replace:
 * - RESOURCE_NAME (e.g., Product, User, Order)
 * - Add/remove fields as needed
 */

import {
  IsString,
  IsInt,
  IsBoolean,
  IsOptional,
  MinLength,
  MaxLength,
  Min,
  Max,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Create RESOURCE_NAME Request DTO
 * Used for POST /api/RESOURCE_LOWERs
 */
export class CreateRESOURCE_NAMEDto {
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  name: string;

  @IsString()
  @MaxLength(500)
  description: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  price?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

/**
 * Update RESOURCE_NAME Request DTO
 * Used for PUT /api/RESOURCE_LOWERs/:id
 */
export class UpdateRESOURCE_NAMEDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  price?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

/**
 * Query Parameters for RESOURCE_NAME List
 * Used for GET /api/RESOURCE_LOWERs
 */
export class RESOURCE_NAMEListQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @IsOptional()
  @IsString()
  query?: string;

  @IsOptional()
  @IsEnum(['name', 'price', 'createdAt'])
  sortBy?: string;

  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isActive?: boolean;
}

/**
 * RESOURCE_NAME Response DTO
 * Used for all response bodies
 */
export interface RESOURCE_NAMEResponseDto {
  id: string;
  name: string;
  description: string;
  price?: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * RESOURCE_NAME List Response DTO
 * Used for paginated list responses
 */
export interface RESOURCE_NAMEListResponseDto {
  success: true;
  data: RESOURCE_NAMEResponseDto[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
