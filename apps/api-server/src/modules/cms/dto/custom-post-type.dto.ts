import { IsString, IsBoolean, IsOptional, IsEnum, IsObject, IsArray, MinLength, MaxLength } from 'class-validator';
import { CPTStatus } from '../entities/CustomPostType.js';

export class CreateCPTDto {
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  slug: string;

  @IsString()
  @MinLength(3)
  @MaxLength(255)
  name: string;

  @IsString()
  @MaxLength(50)
  icon: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsObject()
  schema: any;

  @IsBoolean()
  @IsOptional()
  isPublic?: boolean;

  @IsBoolean()
  @IsOptional()
  isHierarchical?: boolean;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  supportedFeatures?: string[];
}

export class UpdateCPTDto {
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  @IsOptional()
  slug?: string;

  @IsString()
  @MinLength(3)
  @MaxLength(255)
  @IsOptional()
  name?: string;

  @IsString()
  @MaxLength(50)
  @IsOptional()
  icon?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsObject()
  @IsOptional()
  schema?: any;

  @IsEnum(CPTStatus)
  @IsOptional()
  status?: CPTStatus;

  @IsBoolean()
  @IsOptional()
  isPublic?: boolean;

  @IsBoolean()
  @IsOptional()
  isHierarchical?: boolean;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  supportedFeatures?: string[];
}

export class CPTQueryDto {
  @IsEnum(CPTStatus)
  @IsOptional()
  status?: CPTStatus;

  @IsBoolean()
  @IsOptional()
  isPublic?: boolean;

  @IsString()
  @IsOptional()
  search?: string;

  @IsOptional()
  page?: number;

  @IsOptional()
  limit?: number;
}
