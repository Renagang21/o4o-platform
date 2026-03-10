import { IsEmail, IsString, MinLength, IsOptional, IsBoolean, IsIn, IsInt, Min, Max, Matches } from 'class-validator';

/**
 * Register Request DTO
 *
 * WO-NETURE-REGISTER-IDENTITY-STABILIZATION-V1
 * 5개 서비스(KPA, GlycoPharm, Neture, K-Cosmetics, GlucoseView) 공유 DTO.
 * 서비스별 필드 차이를 수용하기 위해 이름/동의 필드는 optional.
 * Controller에서 서비스별 정규화 수행.
 */
export class RegisterRequestDto {
  @IsEmail({}, { message: 'Valid email is required' })
  email: string;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  @Matches(/^(?=.*[a-zA-Z])(?=.*\d)(?=.*[^A-Za-z\d\s]).+$/, {
    message: 'Password must contain letter, number and special character',
  })
  password: string;

  @IsOptional()
  @IsString()
  passwordConfirm?: string;

  // --- 이름 필드 (서비스별 택일) ---

  /** KPA/GlycoPharm: 성 */
  @IsOptional()
  @IsString()
  lastName?: string;

  /** KPA/GlycoPharm: 이름 */
  @IsOptional()
  @IsString()
  firstName?: string;

  /** Neture/K-Cosmetics: 단일 이름 필드 */
  @IsOptional()
  @IsString()
  name?: string;

  /** KPA/GlycoPharm: 닉네임 (포럼 표시용) */
  @IsOptional()
  @IsString()
  nickname?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  role?: string;

  @IsOptional()
  @IsString()
  service?: string;

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

  // --- 사업자 정보 ---

  @IsOptional()
  @IsString()
  businessName?: string;

  @IsOptional()
  @IsString()
  businessNumber?: string;

  /** Neture: 회사명 (Controller에서 businessName으로 정규화) */
  @IsOptional()
  @IsString()
  companyName?: string;

  /** Neture: 사업 유형 (cosmetics, health, medical, food, other) */
  @IsOptional()
  @IsString()
  businessType?: string;

  // --- GlucoseView 전용 필드 ---

  /** GlucoseView: 표시 이름 (사이트에서 보일 이름) */
  @IsOptional()
  @IsString()
  displayName?: string;

  /** GlucoseView: 약국명 */
  @IsOptional()
  @IsString()
  pharmacyName?: string;

  /** GlucoseView: 지부 ID */
  @IsOptional()
  @IsString()
  branchId?: string;

  /** GlucoseView: 분회 ID */
  @IsOptional()
  @IsString()
  chapterId?: string;

  // --- 동의 필드 (서비스별 택일) ---

  /** KPA/GlycoPharm: 약관 동의 */
  @IsOptional()
  @IsBoolean()
  tos?: boolean;

  /** Neture/K-Cosmetics: 약관 동의 (Controller에서 tos와 통합) */
  @IsOptional()
  @IsBoolean()
  agreeTerms?: boolean;

  /** Neture/K-Cosmetics: 개인정보 동의 (Controller에서 privacyAccepted와 통합) */
  @IsOptional()
  @IsBoolean()
  agreePrivacy?: boolean;

  /** GlycoPharm: 개인정보 동의 */
  @IsOptional()
  @IsBoolean()
  privacyAccepted?: boolean;

  /** Neture/K-Cosmetics: 마케팅 동의 (Controller에서 marketingAccepted와 통합) */
  @IsOptional()
  @IsBoolean()
  agreeMarketing?: boolean;

  /** GlycoPharm: 마케팅 동의 */
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
