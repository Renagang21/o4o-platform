import { IsEmail, IsString, MinLength, IsOptional, IsBoolean } from 'class-validator';

/**
 * Login Request DTO
 *
 * Validates login credentials for email/password authentication
 */
export class LoginRequestDto {
  @IsEmail({}, { message: 'Valid email is required' })
  email: string;

  @IsString()
  @MinLength(6, { message: 'Password must be at least 6 characters' })
  password: string;

  /**
   * Service key for service-scoped login.
   * WO-O4O-LOGIN-SERVICEKEY-PARAMETER-V1: 서비스 독립 인증 구조 기반 작업.
   * 제공 시 해당 서비스의 멤버십 존재 여부를 추가 검증한다.
   * 미제공 시 기존 전역 인증 방식으로 fallback.
   */
  @IsOptional()
  @IsString()
  serviceKey?: string;

  @IsOptional()
  @IsString()
  deviceId?: string;

  /**
   * Request tokens in response body for localStorage strategy clients.
   * Cross-origin requests automatically receive tokens without this flag.
   * @see packages/auth-client for usage
   */
  @IsOptional()
  @IsBoolean()
  includeLegacyTokens?: boolean;
}

/**
 * Login Response DTO
 *
 * Standard response structure for successful login
 */
export interface LoginResponseDto {
  success: boolean;
  message: string;
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
    status: string;
  };
}
