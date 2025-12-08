import {
  IsUUID,
  IsOptional,
  IsEnum,
  IsNumber,
  Min
} from 'class-validator';
import { EnrollmentStatus } from '@o4o/lms-core';

export class EnrollCourseDto {
  @IsUUID()
  courseId: string;

  @IsUUID()
  userId: string;
}

export class UpdateEnrollmentDto {
  @IsEnum(EnrollmentStatus)
  @IsOptional()
  status?: EnrollmentStatus;

  @IsNumber()
  @Min(0)
  @IsOptional()
  progressPercentage?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  completedLessons?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  totalLessons?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  timeSpent?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  finalScore?: number;
}

export class EnrollmentQueryDto {
  @IsEnum(EnrollmentStatus)
  @IsOptional()
  status?: EnrollmentStatus;

  @IsUUID()
  @IsOptional()
  courseId?: string;

  @IsUUID()
  @IsOptional()
  userId?: string;

  @IsUUID()
  @IsOptional()
  organizationId?: string;

  @IsOptional()
  page?: number;

  @IsOptional()
  limit?: number;
}
