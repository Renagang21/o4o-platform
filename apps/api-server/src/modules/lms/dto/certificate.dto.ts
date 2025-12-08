import {
  IsUUID,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsString,
  IsObject,
  Min,
  Max,
  MaxLength
} from 'class-validator';

export class IssueCertificateDto {
  @IsUUID()
  userId: string;

  @IsUUID()
  courseId: string;

  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  finalScore?: number;

  @IsString()
  @MaxLength(255)
  @IsOptional()
  issuerName?: string;

  @IsString()
  @MaxLength(255)
  @IsOptional()
  issuerTitle?: string;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}

export class UpdateCertificateDto {
  @IsString()
  @MaxLength(500)
  @IsOptional()
  certificateUrl?: string;

  @IsString()
  @MaxLength(500)
  @IsOptional()
  badgeUrl?: string;

  @IsBoolean()
  @IsOptional()
  isValid?: boolean;

  @IsOptional()
  expiresAt?: Date;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}

export class CertificateQueryDto {
  @IsUUID()
  @IsOptional()
  userId?: string;

  @IsUUID()
  @IsOptional()
  courseId?: string;

  @IsBoolean()
  @IsOptional()
  isValid?: boolean;

  @IsOptional()
  page?: number;

  @IsOptional()
  limit?: number;
}

export class VerifyCertificateDto {
  @IsString()
  verificationCode: string;
}
