import { IsEmail, IsString, MinLength, IsNotEmpty } from 'class-validator';

/**
 * Password Reset Request DTO
 *
 * Validates email for password reset request
 */
export class PasswordResetRequestDto {
  @IsEmail({}, { message: 'Valid email is required' })
  email: string;
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
 * Password Reset Response DTO
 *
 * Standard response structure for password reset operations
 */
export interface PasswordResetResponseDto {
  success: boolean;
  message: string;
}
