import { IsString, IsNotEmpty } from 'class-validator';

/**
 * Email Verification DTO
 *
 * Validates email verification token
 */
export class EmailVerificationDto {
  @IsString()
  @IsNotEmpty({ message: 'Verification token is required' })
  token: string;
}

/**
 * Email Verification Response DTO
 *
 * Standard response structure for email verification
 */
export interface EmailVerificationResponseDto {
  success: boolean;
  message: string;
}
