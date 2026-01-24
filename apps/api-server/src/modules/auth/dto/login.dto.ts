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
   * Include tokens in response body for cross-domain authentication
   * When true, accessToken and refreshToken are included in the JSON response
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
