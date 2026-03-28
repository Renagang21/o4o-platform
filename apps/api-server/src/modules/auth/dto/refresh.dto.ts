import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';

/**
 * Refresh Token Request DTO
 *
 * Validates refresh token request (optional - can also come from cookies)
 * includeLegacyTokens: auth-client localStorage strategy sends this flag
 */
export class RefreshTokenRequestDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  refreshToken?: string;

  @IsOptional()
  @IsBoolean()
  includeLegacyTokens?: boolean;
}

/**
 * Refresh Token Response DTO
 *
 * Standard response structure for token refresh
 */
export interface RefreshTokenResponseDto {
  success: boolean;
  message: string;
  accessToken: string;
  refreshToken?: string;
}
