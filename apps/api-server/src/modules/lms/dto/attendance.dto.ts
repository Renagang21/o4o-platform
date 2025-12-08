import {
  IsUUID,
  IsOptional,
  IsEnum,
  IsString,
  IsObject,
  MaxLength
} from 'class-validator';
import { AttendanceStatus } from '@o4o/lms-core';

export class CheckInDto {
  @IsUUID()
  eventId: string;

  @IsUUID()
  userId: string;

  @IsString()
  @MaxLength(20)
  @IsOptional()
  attendanceCode?: string;

  @IsObject()
  @IsOptional()
  geoLocation?: {
    latitude: number;
    longitude: number;
  };
}

export class UpdateAttendanceDto {
  @IsEnum(AttendanceStatus)
  @IsOptional()
  status?: AttendanceStatus;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class MarkAttendanceDto {
  @IsUUID()
  userId: string;

  @IsEnum(AttendanceStatus)
  status: AttendanceStatus;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class AttendanceQueryDto {
  @IsEnum(AttendanceStatus)
  @IsOptional()
  status?: AttendanceStatus;

  @IsUUID()
  @IsOptional()
  eventId?: string;

  @IsUUID()
  @IsOptional()
  userId?: string;

  @IsOptional()
  page?: number;

  @IsOptional()
  limit?: number;
}
