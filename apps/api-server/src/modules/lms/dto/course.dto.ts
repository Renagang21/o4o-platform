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
import { CourseStatus, ContentKind, CourseVisibility } from '@o4o/lms-core';

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

  // WO-KPA-CONTENT-COURSE-KIND-SEPARATION-V1: 코스형 자료 vs 일반 강의 (미전달 시 'lecture')
  @IsEnum(ContentKind)
  @IsOptional()
  contentKind?: ContentKind;

  // WO-KPA-LMS-COURSE-VISIBILITY-ACCESS-V1: 공개/회원제 (미전달 시 'members')
  @IsEnum(CourseVisibility)
  @IsOptional()
  visibility?: CourseVisibility;
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

  // WO-KPA-LMS-COURSE-VISIBILITY-ACCESS-V1: 공개/회원제 변경
  @IsEnum(CourseVisibility)
  @IsOptional()
  visibility?: CourseVisibility;
}

export class CourseQueryDto {
  @IsEnum(CourseStatus)
  @IsOptional()
  status?: CourseStatus;

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
