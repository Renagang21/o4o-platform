import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

/**
 * Refresh Token Request DTO
 *
 * Validates refresh token request (optional - can also come from cookies)
 */
export class RefreshTokenRequestDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  refreshToken?: string;
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
