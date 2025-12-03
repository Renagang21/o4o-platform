import { IsString, MinLength } from 'class-validator';

/**
 * Change Password Request DTO
 *
 * Validates password change request
 */
export class ChangePasswordDto {
  @IsString()
  @MinLength(6, { message: 'Current password is required' })
  currentPassword: string;

  @IsString()
  @MinLength(8, { message: 'New password must be at least 8 characters' })
  newPassword: string;

  @IsString()
  newPasswordConfirm: string;
}

/**
 * Change Password Response DTO
 *
 * Standard response structure for password change
 */
export interface ChangePasswordResponseDto {
  success: boolean;
  message: string;
}
