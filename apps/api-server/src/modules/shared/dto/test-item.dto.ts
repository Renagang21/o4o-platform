import {
  IsString,
  IsInt,
  IsBoolean,
  IsOptional,
  MinLength,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Create TestItem Request DTO
 */
export class CreateTestItemDto {
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  value?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

/**
 * Update TestItem Request DTO
 */
export class UpdateTestItemDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  value?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

/**
 * TestItem Response DTO
 */
export interface TestItemResponseDto {
  id: string;
  name: string;
  description: string;
  value: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
