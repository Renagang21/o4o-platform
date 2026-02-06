import { IsString, IsOptional, IsEmail, IsUrl, MinLength, MaxLength } from 'class-validator';

/**
 * Update Profile Request DTO
 *
 * Validates user profile update data
 *
 * WO-KPA-SUPER-OPERATOR-BASELINE-REFINE-V1: 이름 구조 확장
 * - name: 단일 표시명 (기존 호환)
 * - firstName: 이름 (선택)
 * - lastName: 성 (선택)
 * - nickname: 닉네임/표시명 (선택)
 *
 * 한국식 이름 표시 규칙:
 * - 표시 우선순위: name > (lastName + firstName) > nickname
 */
export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'Name must be at least 2 characters' })
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50, { message: 'First name must be at most 50 characters' })
  firstName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50, { message: 'Last name must be at most 50 characters' })
  lastName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50, { message: 'Nickname must be at most 50 characters' })
  nickname?: string;

  @IsOptional()
  @IsEmail({}, { message: 'Valid email is required' })
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsUrl({}, { message: 'Valid URL is required' })
  avatar?: string;
}

/**
 * Profile Response DTO
 *
 * Standard response structure for user profile
 *
 * WO-KPA-SUPER-OPERATOR-BASELINE-REFINE-V1: 이름 구조 확장
 * - displayName: 최종 표시명 (계산됨)
 * - firstName, lastName, nickname: 분리된 이름 필드
 */
export interface ProfileResponseDto {
  success: boolean;
  data: {
    id: string;
    email: string;
    name: string;
    firstName?: string;
    lastName?: string;
    nickname?: string;
    displayName: string;  // 계산된 최종 표시명
    phone?: string;
    avatar?: string;
    status: string;
    createdAt: Date;
    updatedAt: Date;
  };
}
