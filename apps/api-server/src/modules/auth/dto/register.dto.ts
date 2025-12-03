import { IsEmail, IsString, MinLength, IsOptional, IsBoolean, Matches } from 'class-validator';

/**
 * Register Request DTO
 *
 * Validates user registration data
 */
export class RegisterRequestDto {
  @IsEmail({}, { message: 'Valid email is required' })
  email: string;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
    message: 'Password must contain uppercase, lowercase, number and special character',
  })
  password: string;

  @IsString()
  passwordConfirm: string;

  @IsString()
  @MinLength(2, { message: 'Name must be at least 2 characters' })
  name: string;

  @IsOptional()
  @IsString()
  role?: string;

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
