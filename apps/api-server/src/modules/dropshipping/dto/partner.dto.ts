import {
  IsString,
  IsOptional,
  IsEmail,
  IsNumber,
  Min,
  Max,
  IsEnum,
  IsInt,
  MinLength,
} from 'class-validator';
import { PartnerStatus } from '../entities/Partner.js';

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
export class UpdatePartnerDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  companyName?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  businessNumber?: string;

  @IsOptional()
  @IsEmail()
  contactEmail?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  contactPhone?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  businessAddress?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  referralCode?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  commissionRate?: number;

  @IsOptional()
  @IsEnum(PartnerStatus)
  status?: PartnerStatus;
}
