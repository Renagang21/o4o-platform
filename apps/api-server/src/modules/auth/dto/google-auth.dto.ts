import { IsBoolean, IsDefined, IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Google-only Signup/Login DTOs (WO-O4O-GOOGLE-ONLY-SIGNUP-LOGIN-V1 · WO-2D)
 *
 * 클라이언트는 `idToken` 만 보낸다. userId / email / sub / audience / role / membership 등
 * identity·권한 필드는 `validateDto`(whitelist + forbidNonWhitelisted) 가 400 으로 거절한다.
 */
export class GoogleLoginRequestDto {
  @IsString()
  @IsNotEmpty()
  idToken!: string;

  /** 응답에 해당 서비스 membership 상태를 동봉하기 위한 힌트일 뿐 — 세션 발급 조건이 아니다. */
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  serviceKey?: string;

  @IsOptional()
  @IsBoolean()
  includeLegacyTokens?: boolean;
}

export class GoogleSignupConsentsDto {
  @IsBoolean()
  terms!: boolean;

  @IsBoolean()
  privacy!: boolean;

  @IsOptional()
  @IsBoolean()
  marketing?: boolean;
}

export class GoogleSignupRequestDto {
  @IsString()
  @IsNotEmpty()
  idToken!: string;

  @IsDefined()
  @ValidateNested()
  @Type(() => GoogleSignupConsentsDto)
  consents!: GoogleSignupConsentsDto;

  @IsOptional()
  @IsBoolean()
  includeLegacyTokens?: boolean;
}

// WO-O4O-LEGACY-PASSWORD-AUTH-RETIREMENT-V1:
//   GoogleLinkRequestDto 는 은퇴했다 (`currentPassword` 재인증 전제).

// WO-O4O-GOOGLE-ONLY-AUTH-CLEANUP-V1: Admin Google Bootstrap(전환기 1회용)은 은퇴했다.
//   목적이던 "기존 관리자 users.id 에 Google 연결"은 완료됐고 1회용이라 재사용 경로가 없다.
//   운영 env 에 플래그/코드가 없어 이미 fail-closed 로 닫혀 있었다.
