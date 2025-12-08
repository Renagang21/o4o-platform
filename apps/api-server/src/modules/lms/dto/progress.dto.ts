import {
  IsUUID,
  IsOptional,
  IsEnum,
  IsNumber,
  IsObject,
  Min,
  Max
} from 'class-validator';
import { ProgressStatus } from '@o4o/lms-core';

export class RecordProgressDto {
  @IsUUID()
  enrollmentId: string;

  @IsUUID()
  lessonId: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  timeSpent?: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  completionPercentage?: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  score?: number;

  @IsObject()
  @IsOptional()
  quizAnswers?: Record<string, any>;
}

export class UpdateProgressDto {
  @IsEnum(ProgressStatus)
  @IsOptional()
  status?: ProgressStatus;

  @IsNumber()
  @Min(0)
  @IsOptional()
  timeSpent?: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  completionPercentage?: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  score?: number;

  @IsObject()
  @IsOptional()
  quizAnswers?: Record<string, any>;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}

export class ProgressQueryDto {
  @IsEnum(ProgressStatus)
  @IsOptional()
  status?: ProgressStatus;

  @IsUUID()
  @IsOptional()
  enrollmentId?: string;

  @IsUUID()
  @IsOptional()
  lessonId?: string;

  @IsOptional()
  page?: number;

  @IsOptional()
  limit?: number;
}

export class CompleteProgressDto {
  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  score?: number;
}

export class SubmitQuizDto {
  @IsObject()
  quizAnswers: Record<string, any>;

  @IsNumber()
  @Min(0)
  @Max(100)
  score: number;
}
