import { IsString, IsIn, IsOptional, ValidateNested, MinLength } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Guest Token Issue Request DTO
 *
 * Phase 3: Guest 인증 (WO-AUTH-SERVICE-IDENTITY-PHASE3-QR-GUEST-DEVICE)
 *
 * Validates guest token issuance request for QR/Kiosk/Signage entry
 */
export class GuestTokenIssueRequestDto {
  @IsString()
  @MinLength(1, { message: 'Service ID is required' })
  serviceId: string;

  @IsOptional()
  @IsString()
  storeId?: string;

  @IsOptional()
  @IsString()
  deviceId?: string;

  @IsIn(['qr', 'kiosk', 'signage', 'web'], { message: 'Entry type must be qr, kiosk, signage, or web' })
  entryType: 'qr' | 'kiosk' | 'signage' | 'web';

  @IsOptional()
  metadata?: Record<string, any>;
}

/**
 * Guest Upgrade Credentials DTO
 *
 * OAuth credentials for upgrading guest to service user
 */
export class GuestUpgradeCredentialsDto {
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
 * Guest Upgrade Request DTO
 *
 * Phase 3: Guest 인증 (WO-AUTH-SERVICE-IDENTITY-PHASE3-QR-GUEST-DEVICE)
 *
 * Validates guest to service user upgrade request
 */
export class GuestUpgradeRequestDto {
  @IsString()
  @MinLength(1, { message: 'Guest token is required' })
  guestToken: string;

  @ValidateNested()
  @Type(() => GuestUpgradeCredentialsDto)
  credentials: GuestUpgradeCredentialsDto;
}

/**
 * Guest Token Issue Response interface
 */
export interface GuestTokenIssueResponseDto {
  success: boolean;
  guestSessionId: string;
  tokens: {
    accessToken: string;
    expiresIn: number;
  };
  tokenType: 'guest';
  context: {
    serviceId: string;
    storeId?: string;
    deviceId?: string;
    entryType: string;
  };
}

/**
 * Guest Upgrade Response interface
 */
export interface GuestUpgradeResponseDto {
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
  previousGuestSessionId: string;
  activityPreserved: boolean;
}
