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
