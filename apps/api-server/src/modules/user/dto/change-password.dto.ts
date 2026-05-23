import { IsOptional, IsString, MinLength } from 'class-validator';

/**
 * Change Password Request DTO
 *
 * Validates password change request
 *
 * WO-O4O-IDENTITY-V2-PHASE2-CHANGE-PASSWORD-SERVICE-SCOPE-V1:
 *   serviceKey 가 제공되면 해당 서비스 범위의 credential 만 갱신된다 (V2 path).
 *   미제공 시 기존 V1 흐름 (users.password) 유지.
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

  @IsOptional()
  @IsString()
  serviceKey?: string;
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
