import { IsString, IsNumber, IsOptional, IsEnum, IsBoolean, IsDate, IsArray, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { CouponDiscountType, CouponStatus } from '../entities/Coupon';

export class CreateCouponDto {
  @IsString()
  code: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(CouponDiscountType)
  discountType: CouponDiscountType;

  @IsNumber()
  @Min(0)
  discountValue: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minOrderAmount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  maxDiscountAmount?: number;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  validFrom?: Date;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  validUntil?: Date;

  @IsOptional()
  @IsNumber()
  @Min(0)
  usageLimitPerCoupon?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  usageLimitPerCustomer?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  productIds?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  categoryIds?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  customerIds?: string[];
}

export class UpdateCouponDto {
  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(CouponStatus)
  status?: CouponStatus;

  @IsOptional()
  @IsNumber()
  @Min(0)
  discountValue?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minOrderAmount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  maxDiscountAmount?: number;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  validUntil?: Date;

  @IsOptional()
  @IsNumber()
  @Min(0)
  usageLimitPerCoupon?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  usageLimitPerCustomer?: number;
}

export class GetCouponsQueryDto {
  @IsOptional()
  @IsEnum(CouponStatus)
  status?: CouponStatus;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  active?: boolean;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

export class ValidateCouponDto {
  @IsString()
  code: string;

  @IsString()
  customerId: string;

  @IsNumber()
  @Min(0)
  subtotal: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  productIds?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  categoryIds?: string[];
}

export class ApplyCouponDto {
  @IsString()
  couponCode: string;

  @IsString()
  customerId: string;

  @IsString()
  orderId: string;

  @IsNumber()
  @Min(0)
  subtotal: number;

  @IsOptional()
  @IsString()
  customerEmail?: string;

  @IsOptional()
  @IsString()
  customerName?: string;
}

export interface CouponValidationResult {
  valid: boolean;
  message: string;
  discount?: number;
  discountType?: CouponDiscountType;
  couponId?: string;
}

export interface CouponListResponse {
  coupons: any[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}