import { IsEmail, IsString, MinLength, IsNotEmpty, IsOptional, IsUrl } from 'class-validator';

/**
 * Password Reset Request DTO
 *
 * Validates email for password reset request
 */
export class PasswordResetRequestDto {
  @IsEmail({}, { message: 'Valid email is required' })
  email: string;

  /**
   * WO-O4O-PASSWORD-RESET-SERVICE-ISOLATION-V1:
   * 요청 서비스 키. 제공 시 해당 서비스 membership 보유 여부를 검증한다.
   * 이메일/토큰에 서비스 명칭이 반영된다.
   */
  @IsOptional()
  @IsString()
  serviceKey?: string;

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

  /**
   * WO-O4O-PASSWORD-RESET-SERVICE-ISOLATION-V1:
   * 재설정 요청 서비스 키. 토큰의 serviceKey와 일치하는지 검증한다.
   */
  @IsOptional()
  @IsString()
  serviceKey?: string;
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
