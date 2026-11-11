import { Equals, IsBoolean, IsDefined, IsIn, IsNotEmpty, IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { EmailSignupConsentsDto } from './email-auth.dto.js';
import type { SocialProvider } from '../../../services/auth/social-flow.service.js';

export class SocialStartDto {
  @IsOptional() @IsString() @MaxLength(2048)
  returnTo?: string;
}
export class SocialProviderStartDto extends SocialStartDto {
  @IsIn(['google','kakao'])
  provider!: SocialProvider;
}
export class SocialLinkStartDto extends SocialProviderStartDto {
  @IsString() @IsNotEmpty() @MaxLength(100)
  token!: string;
}
export class SocialProofDto {
  @IsString() @IsNotEmpty() @MaxLength(100)
  token!: string;
  @IsOptional() @IsString() @MaxLength(2048)
  code?: string;
  @IsOptional() @IsString() @MaxLength(16384)
  idToken?: string;
  @IsOptional() @IsBoolean()
  includeLegacyTokens?: boolean;
}
export class SocialSignupDto {
  @IsOptional() @IsString() @MaxLength(50)
  nickname?: string;

  @IsString() @IsNotEmpty() @MaxLength(100)
  token!: string;
  // WO-O4O-SOCIAL-SIGNUP-DIRECT-ROLE-REGISTRATION-V1: 카카오 가입은 이메일 · 이름 · 닉네임 · 휴대전화를 받지 않는다.
  // 예전 화면이 보내는 값만 형식 검사 후 무시한다(카카오가 확인한 이메일만 저장).
  @IsOptional() @IsString() @MaxLength(255)
  email?: string;
  @IsOptional() @IsString() @MaxLength(100)
  name?: string;
  @IsOptional() @IsString() @MaxLength(20)
  phone?: string;
  @IsDefined() @ValidateNested() @Type(()=>EmailSignupConsentsDto)
  consents!: EmailSignupConsentsDto;
  @IsOptional() @IsBoolean()
  includeLegacyTokens?: boolean;
}
export class SocialPasswordReauthDto {
  @IsString() @IsNotEmpty() @MaxLength(200)
  password!: string;
}
export class SocialConfirmDto {
  @IsString() @IsNotEmpty() @MaxLength(100)
  token!: string;
  @Equals(true)
  confirm!: boolean;
}
