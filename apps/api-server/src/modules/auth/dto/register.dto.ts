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
  role?: string;

  @IsOptional()
  @IsString()
  service?: string; // P0-T2: Service key for data isolation

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
