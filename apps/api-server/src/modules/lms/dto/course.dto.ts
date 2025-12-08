import {
  IsString,
  IsBoolean,
  IsOptional,
  IsEnum,
  IsNumber,
  IsUUID,
  IsArray,
  MinLength,
  MaxLength,
  Min
} from 'class-validator';
import { CourseLevel, CourseStatus } from '@o4o/lms-core';

export class CreateCourseDto {
  @IsString()
  @MinLength(3)
  @MaxLength(255)
  title: string;

  @IsString()
  @MinLength(10)
  description: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  thumbnail?: string;

  @IsEnum(CourseLevel)
  @IsOptional()
  level?: CourseLevel;

  @IsNumber()
  @Min(0)
  @IsOptional()
  duration?: number;

  @IsUUID()
  instructorId: string;

  @IsUUID()
  @IsOptional()
  organizationId?: string;

  @IsBoolean()
  @IsOptional()
  isOrganizationExclusive?: boolean;

  @IsBoolean()
  @IsOptional()
  isRequired?: boolean;

  @IsBoolean()
  @IsOptional()
  requiresApproval?: boolean;

  @IsNumber()
  @Min(1)
  @IsOptional()
  maxEnrollments?: number;

  @IsOptional()
  startAt?: Date;

  @IsOptional()
  endAt?: Date;

  @IsNumber()
  @Min(0)
  @IsOptional()
  credits?: number;

  @IsOptional()
  metadata?: Record<string, any>;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];
}

export class UpdateCourseDto {
  @IsString()
  @MinLength(3)
  @MaxLength(255)
  @IsOptional()
  title?: string;

  @IsString()
  @MinLength(10)
  @IsOptional()
  description?: string;

  @IsString()
  @MaxLength(500)
  @IsOptional()
  thumbnail?: string;

  @IsEnum(CourseLevel)
  @IsOptional()
  level?: CourseLevel;

  @IsEnum(CourseStatus)
  @IsOptional()
  status?: CourseStatus;

  @IsNumber()
  @Min(0)
  @IsOptional()
  duration?: number;

  @IsUUID()
  @IsOptional()
  instructorId?: string;

  @IsBoolean()
  @IsOptional()
  isOrganizationExclusive?: boolean;

  @IsBoolean()
  @IsOptional()
  isRequired?: boolean;

  @IsBoolean()
  @IsOptional()
  requiresApproval?: boolean;

  @IsNumber()
  @Min(1)
  @IsOptional()
  maxEnrollments?: number;

  @IsOptional()
  startAt?: Date;

  @IsOptional()
  endAt?: Date;

  @IsNumber()
  @Min(0)
  @IsOptional()
  credits?: number;

  @IsOptional()
  metadata?: Record<string, any>;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];
}

export class CourseQueryDto {
  @IsEnum(CourseStatus)
  @IsOptional()
  status?: CourseStatus;

  @IsEnum(CourseLevel)
  @IsOptional()
  level?: CourseLevel;

  @IsUUID()
  @IsOptional()
  organizationId?: string;

  @IsUUID()
  @IsOptional()
  instructorId?: string;

  @IsBoolean()
  @IsOptional()
  isRequired?: boolean;

  @IsString()
  @IsOptional()
  search?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @IsOptional()
  page?: number;

  @IsOptional()
  limit?: number;
}
