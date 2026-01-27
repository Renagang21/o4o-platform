import { IsString, IsIn, IsOptional, MinLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Service Login Credentials DTO
 *
 * Phase 1: Service User 인증 기반 (WO-AUTH-SERVICE-IDENTITY-PHASE1)
 *
 * Validates OAuth-based service user credentials
 */
export class ServiceLoginCredentialsDto {
  @IsIn(['google', 'kakao', 'naver'], { message: 'Provider must be google, kakao, or naver' })
  provider: 'google' | 'kakao' | 'naver';

  @IsString()
  @MinLength(1, { message: 'OAuth token is required' })
  oauthToken: string;

  @IsString()
  @MinLength(1, { message: 'Service ID is required' })
  serviceId: string;

  @IsOptional()
  @IsString()
  storeId?: string;
}

/**
 * Service Login Request DTO
 *
 * Phase 1: Service User 인증 기반 (WO-AUTH-SERVICE-IDENTITY-PHASE1)
 *
 * Validates complete service user login request
 */
export class ServiceLoginRequestDto {
  @ValidateNested()
  @Type(() => ServiceLoginCredentialsDto)
  credentials: ServiceLoginCredentialsDto;
}

/**
 * Service Login Response interface
 *
 * Response structure for successful service user login
 */
export interface ServiceLoginResponseDto {
  success: boolean;
  user: {
    providerUserId: string;
    provider: 'google' | 'kakao' | 'naver';
    email: string;
    displayName?: string;
    profileImage?: string;
    serviceId: string;
    storeId?: string;
  };
  tokens: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  };
  tokenType: 'service';
}
