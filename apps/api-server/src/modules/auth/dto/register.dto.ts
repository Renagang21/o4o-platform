import { IsEmail, IsString, MinLength, IsOptional, IsBoolean, IsIn, IsInt, Min, Max, Matches } from 'class-validator';

/**
 * Register Request DTO
 *
 * Validates user registration data
 * Phase 3: membershipType으로 약사/약대생 분기
 */
export class RegisterRequestDto {
  @IsEmail({}, { message: 'Valid email is required' })
  email: string;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d\s]).+$/, {
    message: 'Password must contain uppercase, lowercase, number and special character',
  })
  password: string;

  @IsString()
  passwordConfirm: string;

  @IsString()
  @MinLength(1, { message: 'Last name is required' })
  lastName: string;

  @IsString()
  @MinLength(1, { message: 'First name is required' })
  firstName: string;

  @IsString()
  @MinLength(2, { message: 'Nickname must be at least 2 characters' })
  nickname: string; // P1-T2: Nickname for forum/public display

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  role?: string;

  @IsOptional()
  @IsString()
  service?: string; // P0-T2: Service key for data isolation

  @IsOptional()
  @IsIn(['pharmacist', 'student'])
  membershipType?: 'pharmacist' | 'student';

  @IsOptional()
  @IsString()
  licenseNumber?: string;

  @IsOptional()
  @IsString()
  universityName?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(6)
  studentYear?: number;

  @IsOptional()
  @IsString()
  organizationId?: string;

  /** @deprecated WO-ROLE-NORMALIZATION-PHASE3-B-V1: now stored in kpa_pharmacist_profiles */
  @IsOptional()
  @IsString()
  pharmacistFunction?: string;

  /** @deprecated WO-ROLE-NORMALIZATION-PHASE3-B-V1: derived from organization_members + kpa_pharmacist_profiles */
  @IsOptional()
  @IsString()
  pharmacistRole?: string;

  @IsOptional()
  @IsString()
  businessName?: string;

  @IsOptional()
  @IsString()
  businessNumber?: string;

  @IsBoolean()
  tos: boolean;

  @IsOptional()
  @IsBoolean()
  privacyAccepted?: boolean;

  @IsOptional()
  @IsBoolean()
  marketingAccepted?: boolean;
}

/**
 * Register Response DTO
 *
 * Standard response structure for successful registration
 */
export interface RegisterResponseDto {
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
  redirectUrl?: string;
}
