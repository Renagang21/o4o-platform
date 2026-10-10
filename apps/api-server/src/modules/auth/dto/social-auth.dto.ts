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
  @IsString() @IsNotEmpty() @MaxLength(100)
  token!: string;
  @IsString() @IsNotEmpty() @MaxLength(255)
  email!: string;
  @IsString() @IsNotEmpty() @MaxLength(100)
  name!: string;
  @IsString() @IsNotEmpty() @MaxLength(20)
  phone!: string;
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
