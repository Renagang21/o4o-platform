import { IsString, IsNumber, IsOptional, IsEnum, IsNotEmpty, Min, Max, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateCommissionPolicyDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(['rate', 'fixed'])
  @IsNotEmpty()
  type!: 'rate' | 'fixed';

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  value!: number;

  @IsUUID()
  @IsOptional()
  sellerId?: string;

  @IsUUID()
  @IsOptional()
  supplierId?: string;

  @IsUUID()
  @IsOptional()
  partnerId?: string;

  @IsUUID()
  @IsOptional()
  productId?: string;

  @IsNumber()
  @Min(0)
  @Max(100)
  @Type(() => Number)
  @IsOptional()
  platformShare?: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  @Type(() => Number)
  @IsOptional()
  sellerShare?: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  @Type(() => Number)
  @IsOptional()
  partnerShare?: number;
}

export class UpdateCommissionPolicyDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(['rate', 'fixed'])
  @IsOptional()
  type?: 'rate' | 'fixed';

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  @IsOptional()
  value?: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  @Type(() => Number)
  @IsOptional()
  platformShare?: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  @Type(() => Number)
  @IsOptional()
  sellerShare?: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  @Type(() => Number)
  @IsOptional()
  partnerShare?: number;
}
