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
