import { IsString, IsOptional, IsObject, IsArray, IsNotEmpty, IsEmail, IsNumber, Min, MinLength, MaxLength, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';

export interface SupplierPolicyDto {
  minOrderAmount?: number;
  maxOrderAmount?: number;
  processingTime?: number;
  returnPolicy?: string;
  shippingPolicy?: string;
  paymentTerms?: string;
}

export interface SellerTierPricingDto {
  bronze: number;
  silver: number;
  gold: number;
  platinum: number;
}

export class SupplierApplicationDto {
  @IsUUID()
  @IsNotEmpty()
  userId!: string;

  @IsString()
  @IsOptional()
  companyDescription?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  specialties?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  certifications?: string[];

  @IsString()
  @IsOptional()
  @MaxLength(255)
  website?: string;

  @IsObject()
  @IsOptional()
  sellerTierDiscounts?: SellerTierPricingDto;

  @IsObject()
  @IsOptional()
  supplierPolicy?: SupplierPolicyDto;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  @IsOptional()
  defaultPartnerCommissionRate?: number;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  @IsOptional()
  defaultPartnerCommissionAmount?: number;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  taxId?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  bankName?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  bankAccount?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  accountHolder?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  contactPerson?: string;

  @IsString()
  @IsOptional()
  @MaxLength(20)
  contactPhone?: string;

  @IsEmail()
  @IsOptional()
  contactEmail?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  operatingHours?: string[];

  @IsString()
  @IsOptional()
  @MaxLength(10)
  timezone?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  shippingMethods?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  paymentMethods?: string[];

  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  foundedYear?: number;

  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  employeeCount?: number;

  @IsObject()
  @IsOptional()
  socialMedia?: {
    website?: string;
    linkedin?: string;
    facebook?: string;
    instagram?: string;
  };

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}

export class UpdateSupplierDto {
  @IsString()
  @IsOptional()
  companyDescription?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  specialties?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  certifications?: string[];

  @IsObject()
  @IsOptional()
  sellerTierDiscounts?: SellerTierPricingDto;

  @IsObject()
  @IsOptional()
  supplierPolicy?: SupplierPolicyDto;

  @IsObject()
  @IsOptional()
  socialMedia?: {
    website?: string;
    linkedin?: string;
    facebook?: string;
    instagram?: string;
  };
}
