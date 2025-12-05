import { IsString, IsOptional, IsObject, IsArray, IsNotEmpty, MinLength, MaxLength, IsEmail, IsUUID } from 'class-validator';

export interface SellerBrandingDto {
  storeName: string;
  storeDescription?: string;
  logo?: string;
  banner?: string;
  colors?: {
    primary?: string;
    secondary?: string;
  };
}

export interface SellerPolicyDto {
  returnPolicy?: string;
  shippingPolicy?: string;
  customerService?: string;
  termsOfService?: string;
}

export class SellerApplicationDto {
  @IsUUID()
  @IsNotEmpty()
  userId!: string;

  @IsObject()
  @IsNotEmpty()
  branding!: SellerBrandingDto;

  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(255)
  storeSlug!: string;

  @IsObject()
  @IsOptional()
  policies?: SellerPolicyDto;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  shippingMethods?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  paymentMethods?: string[];

  @IsString()
  @IsOptional()
  @MaxLength(10)
  timezone?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  operatingHours?: string[];

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

  @IsString()
  @IsOptional()
  partnerInviteMessage?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  partnerRequirements?: string[];

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}

export class UpdateSellerDto {
  @IsObject()
  @IsOptional()
  branding?: SellerBrandingDto;

  @IsString()
  @IsOptional()
  @MinLength(3)
  @MaxLength(255)
  storeSlug?: string;

  @IsObject()
  @IsOptional()
  policies?: SellerPolicyDto;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  shippingMethods?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  paymentMethods?: string[];

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
}
