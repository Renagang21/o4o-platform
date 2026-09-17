import { IsString, IsIn, IsOptional, MinLength } from 'class-validator';

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
