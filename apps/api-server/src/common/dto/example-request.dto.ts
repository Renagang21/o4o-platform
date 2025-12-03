import {
  IsString,
  IsEmail,
  IsInt,
  IsOptional,
  IsBoolean,
  IsEnum,
  MinLength,
  MaxLength,
  Min,
  Max,
  IsArray,
  IsUUID,
  IsUrl,
  IsDate,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * EXAMPLE REQUEST DTO TEMPLATE
 *
 * This file shows how to create request DTOs with proper validation.
 * Copy this pattern when creating DTOs for your module.
 */

// Example: Login Request
export class ExampleLoginRequestDto {
  @IsEmail()
  @MaxLength(255)
  email: string;

  @IsString()
  @MinLength(6)
  @MaxLength(100)
  password: string;

  @IsOptional()
  @IsBoolean()
  rememberMe?: boolean;
}

// Example: User Creation Request
export class ExampleCreateUserRequestDto {
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  firstName: string;

  @IsString()
  @MinLength(2)
  @MaxLength(50)
  lastName: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'Password must contain uppercase, lowercase, and number',
  })
  password: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phoneNumber?: string;

  @IsEnum(['admin', 'user', 'seller', 'supplier'])
  role: string;
}

// Example: Product Update Request
export class ExampleUpdateProductRequestDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  price?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  stock?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsUrl()
  imageUrl?: string;
}

// Example: Search Query Parameters
export class ExampleSearchQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  query?: string;

  @IsOptional()
  @IsEnum(['name', 'price', 'createdAt'])
  sortBy?: string;

  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

// Example: ID Parameter Validation
export class ExampleIdParamDto {
  @IsUUID()
  id: string;
}

// Example: Date Range Query
export class ExampleDateRangeQueryDto {
  @Type(() => Date)
  @IsDate()
  startDate: Date;

  @Type(() => Date)
  @IsDate()
  endDate: Date;
}

/**
 * Common Validation Decorators Cheat Sheet:
 *
 * String Validations:
 * - @IsString()
 * - @MinLength(min)
 * - @MaxLength(max)
 * - @Matches(regex)
 * - @IsEmail()
 * - @IsUrl()
 * - @IsUUID()
 *
 * Number Validations:
 * - @IsInt()
 * - @IsNumber()
 * - @Min(min)
 * - @Max(max)
 * - @IsPositive()
 * - @IsNegative()
 *
 * Boolean:
 * - @IsBoolean()
 *
 * Date:
 * - @IsDate()
 * - @Type(() => Date)  // Required for transformation
 *
 * Arrays:
 * - @IsArray()
 * - @ArrayMinSize(min)
 * - @ArrayMaxSize(max)
 * - @IsString({ each: true })  // Validate each element
 *
 * Enums:
 * - @IsEnum(enumObject)
 *
 * Optional:
 * - @IsOptional()  // Makes field optional
 *
 * Nested Objects:
 * - @ValidateNested()
 * - @Type(() => NestedDtoClass)
 *
 * Type Transformation:
 * - @Type(() => Number)  // Convert string to number
 * - @Type(() => Date)    // Convert string to Date
 * - @Type(() => Boolean) // Convert string to boolean
 */
