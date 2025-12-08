import {
  IsString,
  IsBoolean,
  IsOptional,
  IsEnum,
  IsNumber,
  IsUUID,
  IsObject,
  IsArray,
  MinLength,
  MaxLength,
  Min
} from 'class-validator';
import { LessonType } from '@o4o/lms-core';

export class CreateLessonDto {
  @IsUUID()
  courseId: string;

  @IsString()
  @MinLength(3)
  @MaxLength(255)
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(LessonType)
  type: LessonType;

  @IsObject()
  @IsOptional()
  content?: Record<string, any>;

  @IsString()
  @MaxLength(500)
  @IsOptional()
  videoUrl?: string;

  @IsString()
  @MaxLength(500)
  @IsOptional()
  videoThumbnail?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  videoDuration?: number;

  @IsArray()
  @IsOptional()
  attachments?: Array<{
    name: string;
    url: string;
    type: string;
    size: number;
  }>;

  @IsNumber()
  @Min(0)
  @IsOptional()
  order?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  duration?: number;

  @IsObject()
  @IsOptional()
  quizData?: any;

  @IsBoolean()
  @IsOptional()
  isPublished?: boolean;

  @IsBoolean()
  @IsOptional()
  isFree?: boolean;

  @IsBoolean()
  @IsOptional()
  requiresCompletion?: boolean;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}

export class UpdateLessonDto {
  @IsString()
  @MinLength(3)
  @MaxLength(255)
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(LessonType)
  @IsOptional()
  type?: LessonType;

  @IsObject()
  @IsOptional()
  content?: Record<string, any>;

  @IsString()
  @MaxLength(500)
  @IsOptional()
  videoUrl?: string;

  @IsString()
  @MaxLength(500)
  @IsOptional()
  videoThumbnail?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  videoDuration?: number;

  @IsArray()
  @IsOptional()
  attachments?: Array<{
    name: string;
    url: string;
    type: string;
    size: number;
  }>;

  @IsNumber()
  @Min(0)
  @IsOptional()
  order?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  duration?: number;

  @IsObject()
  @IsOptional()
  quizData?: any;

  @IsBoolean()
  @IsOptional()
  isPublished?: boolean;

  @IsBoolean()
  @IsOptional()
  isFree?: boolean;

  @IsBoolean()
  @IsOptional()
  requiresCompletion?: boolean;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}

export class LessonQueryDto {
  @IsEnum(LessonType)
  @IsOptional()
  type?: LessonType;

  @IsBoolean()
  @IsOptional()
  isPublished?: boolean;

  @IsBoolean()
  @IsOptional()
  isFree?: boolean;

  @IsOptional()
  page?: number;

  @IsOptional()
  limit?: number;
}

export class ReorderLessonsDto {
  @IsArray()
  lessonIds: string[];
}
