import { IsString, IsOptional, IsObject, IsArray, IsBoolean, IsNumber, Min, Max, MinLength, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateSellerProfileDto {
  @IsObject()
  @IsOptional()
  branding?: {
    storeName?: string;
    storeDescription?: string;
    logo?: string;
    banner?: string;
    colors?: {
      primary?: string;
      secondary?: string;
    };
  };

  @IsString()
  @IsOptional()
  @MinLength(3)
  @MaxLength(255)
  storeSlug?: string;

  @IsObject()
  @IsOptional()
  policies?: {
    returnPolicy?: string;
    shippingPolicy?: string;
    customerService?: string;
    termsOfService?: string;
  };

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

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  specialOffers?: string[];

  @IsObject()
  @IsOptional()
  socialMedia?: {
    website?: string;
    facebook?: string;
    instagram?: string;
    twitter?: string;
    youtube?: string;
  };

  @IsString()
  @IsOptional()
  marketingDescription?: string;

  @IsBoolean()
  @IsOptional()
  allowPartners?: boolean;

  @IsString()
  @IsOptional()
  partnerInviteMessage?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  partnerRequirements?: string[];
}
