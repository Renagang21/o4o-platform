import { IsEmail, IsString, MinLength, IsNotEmpty, IsOptional, IsUrl } from 'class-validator';

/**
 * Password Reset Request DTO
 *
 * Validates email for password reset request
 */
export class PasswordResetRequestDto {
  @IsEmail({}, { message: 'Valid email is required' })
  email: string;

  @IsOptional()
  @IsUrl({}, { message: 'Valid URL is required' })
  serviceUrl?: string;
}

/**
 * Password Reset DTO
 *
 * Validates password reset with token
 */
export class PasswordResetDto {
  @IsString()
  @IsNotEmpty({ message: 'Reset token is required' })
  token: string;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  password: string;
}

/**
 * Find ID DTO
 *
 * Validates phone number for account lookup
 */
export class FindIdDto {
  @IsString()
  @IsNotEmpty({ message: 'Phone number is required' })
  phone: string;
}

/**
 * Password Reset Response DTO
 *
 * Standard response structure for password reset operations
 */
export interface PasswordResetResponseDto {
  success: boolean;
  message: string;
}
