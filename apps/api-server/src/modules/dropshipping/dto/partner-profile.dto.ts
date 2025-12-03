import { IsString, IsOptional, IsObject, IsArray, IsNotEmpty, IsBoolean, IsNumber, Min, MinLength, MaxLength, IsEmail, IsUUID, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';

export interface PartnerProfileDataDto {
  bio?: string;
  website?: string;
  socialMedia?: {
    youtube?: string;
    instagram?: string;
    facebook?: string;
    twitter?: string;
    tiktok?: string;
    blog?: string;
  };
  audience?: {
    size?: number;
    demographics?: string;
    interests?: string[];
  };
  marketingChannels?: string[];
}

export interface PayoutInfoDto {
  method: 'bank' | 'paypal' | 'crypto';
  bankName?: string;
  accountNumber?: string;
  accountHolder?: string;
  paypalEmail?: string;
  cryptoAddress?: string;
  currency: string;
}

export class PartnerApplicationDto {
  @IsUUID()
  @IsNotEmpty()
  userId!: string;

  @IsUUID()
  @IsNotEmpty()
  sellerId!: string;

  @IsObject()
  @IsOptional()
  profile?: PartnerProfileDataDto;

  @IsString()
  @IsOptional()
  applicationMessage?: string;

  @IsObject()
  @IsOptional()
  payoutInfo?: PayoutInfoDto;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  @IsOptional()
  minimumPayout?: number;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  allowedPromotionTypes?: string[];

  @IsString()
  @IsOptional()
  @MaxLength(10)
  preferredLanguage?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  webhookUrl?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  webhookEvents?: string[];
}

export class UpdatePartnerProfileDto {
  @IsObject()
  @IsOptional()
  profile?: PartnerProfileDataDto;

  @IsObject()
  @IsOptional()
  payoutInfo?: PayoutInfoDto;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  @IsOptional()
  minimumPayout?: number;

  @IsBoolean()
  @IsOptional()
  emailNotifications?: boolean;

  @IsBoolean()
  @IsOptional()
  smsNotifications?: boolean;

  @IsString()
  @IsOptional()
  @MaxLength(10)
  preferredLanguage?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  webhookUrl?: string;

  @IsBoolean()
  @IsOptional()
  webhookEnabled?: boolean;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  webhookEvents?: string[];
}
