import { IsString, IsOptional, IsEmail, IsUrl, MinLength } from 'class-validator';

/**
 * Update Profile Request DTO
 *
 * Validates user profile update data
 */
export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'Name must be at least 2 characters' })
  name?: string;

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
 */
export interface ProfileResponseDto {
  success: boolean;
  data: {
    id: string;
    email: string;
    name: string;
    phone?: string;
    avatar?: string;
    status: string;
    createdAt: Date;
    updatedAt: Date;
  };
}
