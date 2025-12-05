import { IsString, IsNumber, IsOptional, IsEnum, IsBoolean, IsArray, IsObject, Min, Max, IsNotEmpty, MinLength, MaxLength, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';
import { ProductStatus, ProductType } from '../../../entities/Product.js';

export class CreateProductDto {
  @IsUUID()
  @IsNotEmpty()
  supplierId!: string;

  @IsUUID()
  @IsOptional()
  categoryId?: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(255)
  name!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  description!: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  shortDescription?: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(100)
  sku!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(255)
  slug!: string;

  @IsEnum(ProductType)
  @IsOptional()
  type?: ProductType;

  @IsEnum(ProductStatus)
  @IsOptional()
  status?: ProductStatus;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  supplierPrice!: number;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  recommendedPrice!: number;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  @IsOptional()
  comparePrice?: number;

  @IsString()
  @IsOptional()
  @MaxLength(3)
  currency?: string;

  @IsEnum(['rate', 'fixed'])
  @IsOptional()
  commissionType?: 'rate' | 'fixed';

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  @IsOptional()
  commissionValue?: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  @Type(() => Number)
  @IsOptional()
  sellerCommissionRate?: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  @Type(() => Number)
  @IsOptional()
  platformCommissionRate?: number;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  @IsOptional()
  inventory?: number;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  @IsOptional()
  lowStockThreshold?: number;

  @IsBoolean()
  @IsOptional()
  trackInventory?: boolean;

  @IsBoolean()
  @IsOptional()
  allowBackorder?: boolean;

  @IsObject()
  @IsOptional()
  images?: {
    main: string;
    gallery?: string[];
    thumbnails?: string[];
  };

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @IsArray()
  @IsOptional()
  variants?: Array<{
    id: string;
    name: string;
    sku: string;
    price: number;
    comparePrice?: number;
    inventory: number;
    attributes: Record<string, string>;
  }>;

  @IsBoolean()
  @IsOptional()
  hasVariants?: boolean;

  @IsObject()
  @IsOptional()
  dimensions?: {
    length?: number;
    width?: number;
    height?: number;
    weight?: number;
    unit?: 'cm' | 'in' | 'kg' | 'lb';
  };

  @IsObject()
  @IsOptional()
  shipping?: {
    weight?: number;
    dimensions?: any;
    shippingClass?: string;
    freeShipping?: boolean;
    shippingCost?: number;
  };

  @IsObject()
  @IsOptional()
  seo?: {
    title?: string;
    description?: string;
    keywords?: string[];
    slug?: string;
  };

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  features?: string[];

  @IsString()
  @IsOptional()
  specifications?: string;

  @IsObject()
  @IsOptional()
  tierPricing?: {
    bronze?: number;
    silver?: number;
    gold?: number;
    platinum?: number;
  };

  @IsString()
  @IsOptional()
  @MaxLength(100)
  brand?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  model?: string;

  @IsString()
  @IsOptional()
  warranty?: string;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}
