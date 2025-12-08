import {
  IsString,
  IsBoolean,
  IsOptional,
  IsEnum,
  IsNumber,
  IsUUID,
  MinLength,
  MaxLength,
  Min
} from 'class-validator';
import { LMSEventType, EventStatus } from '@o4o/lms-core';

export class CreateEventDto {
  @IsUUID()
  courseId: string;

  @IsString()
  @MinLength(3)
  @MaxLength(255)
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(LMSEventType)
  type: LMSEventType;

  @IsOptional()
  startAt: Date;

  @IsOptional()
  endAt: Date;

  @IsString()
  @MaxLength(500)
  @IsOptional()
  location?: string;

  @IsString()
  @MaxLength(500)
  @IsOptional()
  onlineUrl?: string;

  @IsBoolean()
  @IsOptional()
  isOnline?: boolean;

  @IsUUID()
  @IsOptional()
  instructorId?: string;

  @IsUUID()
  @IsOptional()
  organizationId?: string;

  @IsBoolean()
  @IsOptional()
  requiresAttendance?: boolean;

  @IsNumber()
  @Min(1)
  @IsOptional()
  maxAttendees?: number;
}

export class UpdateEventDto {
  @IsString()
  @MinLength(3)
  @MaxLength(255)
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(LMSEventType)
  @IsOptional()
  type?: LMSEventType;

  @IsEnum(EventStatus)
  @IsOptional()
  status?: EventStatus;

  @IsOptional()
  startAt?: Date;

  @IsOptional()
  endAt?: Date;

  @IsString()
  @MaxLength(500)
  @IsOptional()
  location?: string;

  @IsString()
  @MaxLength(500)
  @IsOptional()
  onlineUrl?: string;

  @IsBoolean()
  @IsOptional()
  isOnline?: boolean;

  @IsUUID()
  @IsOptional()
  instructorId?: string;

  @IsBoolean()
  @IsOptional()
  requiresAttendance?: boolean;

  @IsNumber()
  @Min(1)
  @IsOptional()
  maxAttendees?: number;
}

export class EventQueryDto {
  @IsEnum(LMSEventType)
  @IsOptional()
  type?: LMSEventType;

  @IsEnum(EventStatus)
  @IsOptional()
  status?: EventStatus;

  @IsUUID()
  @IsOptional()
  courseId?: string;

  @IsUUID()
  @IsOptional()
  organizationId?: string;

  @IsBoolean()
  @IsOptional()
  isOnline?: boolean;

  @IsOptional()
  page?: number;

  @IsOptional()
  limit?: number;
}
