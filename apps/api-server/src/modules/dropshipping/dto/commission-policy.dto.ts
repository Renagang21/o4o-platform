import {
  IsString,
  IsNumber,
  IsOptional,
  IsEnum,
  IsNotEmpty,
  Min,
  Max,
  IsUUID,
  IsBoolean,
  IsArray,
  IsInt,
  ValidateNested,
  IsDateString
} from 'class-validator';
import { Type } from 'class-transformer';
import { PolicyType, PolicyStatus, CommissionType } from '../entities/CommissionPolicy.js';

export class TieredRateDto {
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  minAmount!: number;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  @IsOptional()
  maxAmount?: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  @Type(() => Number)
  @IsOptional()
  rate?: number;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  @IsOptional()
  amount?: number;
}

export class CreateCommissionPolicyDto {
  @IsString()
  @IsNotEmpty()
  policyCode!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(PolicyType)
  @IsNotEmpty()
  policyType!: PolicyType;

  @IsEnum(PolicyStatus)
  @IsOptional()
  status?: PolicyStatus;

  @IsInt()
  @Min(0)
  @Type(() => Number)
  @IsOptional()
  priority?: number;

  @IsUUID()
  @IsOptional()
  partnerId?: string;

  @IsString()
  @IsOptional()
  partnerTier?: string;

  @IsUUID()
  @IsOptional()
  productId?: string;

  @IsUUID()
  @IsOptional()
  supplierId?: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @IsEnum(CommissionType)
  @IsNotEmpty()
  commissionType!: CommissionType;

  @IsNumber()
  @Min(0)
  @Max(100)
  @Type(() => Number)
  @IsOptional()
  commissionRate?: number;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  @IsOptional()
  commissionAmount?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TieredRateDto)
  @IsOptional()
  tieredRates?: TieredRateDto[];

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  @IsOptional()
  minCommission?: number;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  @IsOptional()
  maxCommission?: number;

  @IsDateString()
  @IsOptional()
  validFrom?: string;

  @IsDateString()
  @IsOptional()
  validUntil?: string;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  @IsOptional()
  minOrderAmount?: number;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  @IsOptional()
  maxOrderAmount?: number;

  @IsBoolean()
  @IsOptional()
  requiresNewCustomer?: boolean;

  @IsBoolean()
  @IsOptional()
  excludeDiscountedItems?: boolean;

  @IsInt()
  @Min(1)
  @Type(() => Number)
  @IsOptional()
  maxUsagePerPartner?: number;

  @IsInt()
  @Min(1)
  @Type(() => Number)
  @IsOptional()
  maxUsageTotal?: number;

  @IsBoolean()
  @IsOptional()
  canStackWithOtherPolicies?: boolean;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  exclusiveWith?: string[];

  @IsBoolean()
  @IsOptional()
  requiresApproval?: boolean;
}

export class UpdateCommissionPolicyDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(PolicyStatus)
  @IsOptional()
  status?: PolicyStatus;

  @IsInt()
  @Min(0)
  @Type(() => Number)
  @IsOptional()
  priority?: number;

  @IsUUID()
  @IsOptional()
  partnerId?: string;

  @IsString()
  @IsOptional()
  partnerTier?: string;

  @IsUUID()
  @IsOptional()
  productId?: string;

  @IsUUID()
  @IsOptional()
  supplierId?: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @IsEnum(CommissionType)
  @IsOptional()
  commissionType?: CommissionType;

  @IsNumber()
  @Min(0)
  @Max(100)
  @Type(() => Number)
  @IsOptional()
  commissionRate?: number;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  @IsOptional()
  commissionAmount?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TieredRateDto)
  @IsOptional()
  tieredRates?: TieredRateDto[];

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  @IsOptional()
  minCommission?: number;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  @IsOptional()
  maxCommission?: number;

  @IsDateString()
  @IsOptional()
  validFrom?: string;

  @IsDateString()
  @IsOptional()
  validUntil?: string;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  @IsOptional()
  minOrderAmount?: number;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  @IsOptional()
  maxOrderAmount?: number;

  @IsBoolean()
  @IsOptional()
  requiresNewCustomer?: boolean;

  @IsBoolean()
  @IsOptional()
  excludeDiscountedItems?: boolean;

  @IsInt()
  @Min(1)
  @Type(() => Number)
  @IsOptional()
  maxUsagePerPartner?: number;

  @IsInt()
  @Min(1)
  @Type(() => Number)
  @IsOptional()
  maxUsageTotal?: number;

  @IsBoolean()
  @IsOptional()
  canStackWithOtherPolicies?: boolean;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  exclusiveWith?: string[];
}
