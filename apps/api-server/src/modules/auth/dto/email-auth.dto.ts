import { IsBoolean, IsDefined, IsNotEmpty, IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * 이메일·비밀번호 인증 DTOs (WO-O4O-EMAIL-PASSWORD-AUTH-INTRODUCTION-V1)
 *
 * 여기서는 **형태**(문자열 · 필수 · 상한)만 거절한다. 이메일 형태 · 비밀번호 정책 · 휴대전화 형태는
 * 서비스 계층이 판정한다 — 이메일 · 비밀번호는 `@o4o/auth-utils`(화면과 같은 정본 · 같은 안내 문구), 휴대전화는 `common/auth/phone-shape`.
 * userId · role · membership · serviceKey 등 권한 필드는 `validateDto`(forbidNonWhitelisted) 가 400 으로 거절한다.
 */

export class EmailSignupConsentsDto {
  @IsBoolean()
  terms!: boolean;

  @IsBoolean()
  privacy!: boolean;

  @IsOptional()
  @IsBoolean()
  marketing?: boolean;
}

export class EmailSignupRequestDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  email!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  password!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  name!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  phone!: string;

  @IsDefined()
  @ValidateNested()
  @Type(() => EmailSignupConsentsDto)
  consents!: EmailSignupConsentsDto;
}

export class EmailLoginRequestDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  email!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  password!: string;

  @IsOptional()
  @IsBoolean()
  includeLegacyTokens?: boolean;
}

/** 확인 메일 재발송 · 비밀번호 찾기 공용 */
export class EmailAddressRequestDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  email!: string;
}

export class EmailTokenRequestDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  token!: string;
}

export class PasswordResetRequestDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  token!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  newPassword!: string;
}

export class PasswordSetRequestDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  currentPassword?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  newPassword!: string;
}

export class FindLoginIdRequestDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  name!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  phone!: string;
}
